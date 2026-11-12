import { Prisma, type BookingStatus } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime, generateBookingCode } from "@/lib/utils";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { dispatchNotificationsSafe } from "@/server/notifications/dispatcher";
import {
  canAccessBooking,
  canLecturerOwnBooking,
  canStudentOwnBooking,
  sanitizeConsultationForActor,
} from "@/server/policies/access-policy";
import {
  ACTIVE_BLOCKING_STATUSES,
  canTransitionBookingStatus,
  evaluateStudentCancellation,
  generateBookableSlots,
  isWithinInterval,
} from "@/server/policies/booking-policy";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from "./errors";

function isPgExclusionOrSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as Record<string, unknown> | undefined;
    if (error.code === "P2004" || error.code === "P2034" || meta?.code === "23P01") {
      return true;
    }
  }
  if (error instanceof Error && (error.message.includes("23P01") || error.message.includes("bookings_no_overlap_active"))) {
    return true;
  }
  return false;
}

export async function expireStalePendingBookingsTx(
  tx: Prisma.TransactionClient,
  lecturerId?: string,
  now = new Date()
): Promise<number> {
  const stale = await tx.booking.findMany({
    where: {
      status: "PENDING",
      pendingExpiresAt: { lte: now },
      ...(lecturerId ? { lecturerId } : {}),
    },
    select: { id: true, studentId: true, lecturerId: true },
  });

  if (stale.length === 0) return 0;

  for (const item of stale) {
    await tx.booking.update({
      where: { id: item.id },
      data: {
        status: "CANCELLED",
        cancellationReason: "Kedaluwarsa otomatis setelah melewati batas waktu penahanan booking.",
      },
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: item.id,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        changedBy: null,
        reason: "Kedaluwarsa otomatis sistem",
      },
    });
    await recordAuditLog({
      actorUserId: null,
      action: "BOOKING_AUTO_EXPIRED",
      entityType: "Booking",
      entityId: item.id,
      metadata: { fromStatus: "PENDING", toStatus: "CANCELLED" },
      tx,
    });
  }

  return stale.length;
}

export async function getAvailableSlotsForLecturer(params: {
  lecturerId: string;
  serviceId: string;
  from: Date;
  to: Date;
}) {
  const { lecturerId, serviceId, from, to } = params;
  const now = new Date();
  const policy = await getCampusPolicy();

  const [lecturer, service] = await Promise.all([
    prisma.lecturerProfile.findUnique({
      where: { id: lecturerId },
      include: {
        user: { select: { id: true, name: true, status: true } },
        lecturerServices: { select: { serviceId: true } },
      },
    }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);

  if (!lecturer || lecturer.user.status !== "ACTIVE") {
    throw new NotFoundError("Dosen tidak ditemukan atau sedang tidak aktif.");
  }
  if (!service || !service.isActive) {
    throw new NotFoundError("Layanan konsultasi tidak ditemukan atau nonaktif.");
  }

  if (
    lecturer.lecturerServices.length > 0 &&
    !lecturer.lecturerServices.some((ls) => ls.serviceId === serviceId)
  ) {
    throw new DomainError("Layanan yang dipilih tidak tersedia untuk dosen ini.", 400, "SERVICE_NOT_OFFERED");
  }

  // Pastikan pending yang kedaluwarsa dilepas terlebih dahulu
  await prisma.$transaction(async (tx) => {
    await expireStalePendingBookingsTx(tx, lecturerId, now);
  });

  const [availabilities, blockingBookings] = await Promise.all([
    prisma.availability.findMany({
      where: {
        lecturerId,
        status: "OPEN",
        startAt: { lt: to },
        endAt: { gt: from },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        lecturerId,
        status: { in: [...ACTIVE_BLOCKING_STATUSES] },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: {
        startAt: true,
        endAt: true,
        status: true,
        pendingExpiresAt: true,
      },
    }),
  ]);

  const slots = generateBookableSlots({
    availabilities,
    blockingBookings,
    durationMinutes: service.durationMinutes,
    now,
  });

  return {
    lecturerId: lecturer.id,
    lecturerName: lecturer.user.name,
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    campusTimezone: policy.campusTimezone,
    slots,
  };
}

export async function createBooking(params: {
  actor: AuthenticatedUser;
  lecturerId: string;
  serviceId: string;
  startAt: Date;
  topic: string;
  additionalNotes?: string | null;
  ipAddress?: string | null;
}) {
  const { actor, lecturerId, serviceId, startAt, topic, additionalNotes, ipAddress } = params;

  if (actor.role !== "STUDENT" || !actor.studentProfile) {
    throw new ForbiddenError("Hanya mahasiswa yang dapat mengajukan booking konsultasi.");
  }

  const studentId = actor.studentProfile.id;
  const now = new Date();
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= now.getTime()) {
    throw new DomainError("Waktu booking harus berada di masa mendatang.", 400, "PAST_SLOT");
  }

  const policy = await getCampusPolicy();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Kunci tingkat transaksi per dosen untuk mencegah race condition slot bersamaan
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lecturerId}))`;

      await expireStalePendingBookingsTx(tx, lecturerId, now);

      const lecturer = await tx.lecturerProfile.findUnique({
        where: { id: lecturerId },
        include: {
          user: { select: { id: true, name: true, status: true } },
          lecturerServices: { select: { serviceId: true } },
        },
      });
      if (!lecturer || lecturer.user.status !== "ACTIVE") {
        throw new NotFoundError("Dosen tidak ditemukan atau tidak aktif.");
      }

      const service = await tx.service.findUnique({
        where: { id: serviceId },
      });
      if (!service || !service.isActive) {
        throw new NotFoundError("Layanan konsultasi tidak ditemukan atau nonaktif.");
      }

      if (
        lecturer.lecturerServices.length > 0 &&
        !lecturer.lecturerServices.some((ls) => ls.serviceId === serviceId)
      ) {
        throw new DomainError("Layanan tersebut tidak tersedia untuk dosen ini.", 400, "SERVICE_NOT_OFFERED");
      }

      // Durasi dan endAt dihitung mutlak di server menggunakan snapshot durasi layanan
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

      const matchingAvailability = await tx.availability.findFirst({
        where: {
          lecturerId,
          status: "OPEN",
          startAt: { lte: startAt },
          endAt: { gte: endAt },
        },
      });

      if (!matchingAvailability || !isWithinInterval(startAt, endAt, matchingAvailability.startAt, matchingAvailability.endAt)) {
        throw new DomainError(
          "Waktu booking berada di luar ketersediaan jadwal dosen.",
          400,
          "OUTSIDE_AVAILABILITY"
        );
      }

      // Pengecekan irisan interval di dalam transaksi: A.start < B.end AND A.end > B.start
      const lecturerConflict = await tx.booking.findFirst({
        where: {
          lecturerId,
          status: { in: [...ACTIVE_BLOCKING_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (lecturerConflict) {
        throw new ConflictError(
          "Slot waktu tersebut sudah dipesan atau sedang ditahan. Silakan pilih slot lain."
        );
      }

      // Cegah mahasiswa yang sama memesan dua jadwal bertabrakan secara bersamaan
      const studentConflict = await tx.booking.findFirst({
        where: {
          studentId,
          status: { in: [...ACTIVE_BLOCKING_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (studentConflict) {
        throw new ConflictError(
          "Anda sudah memiliki jadwal konsultasi lain yang bertabrakan pada waktu tersebut."
        );
      }

      const pendingExpiresAt = new Date(now.getTime() + policy.pendingHoldHours * 60 * 60 * 1000);
      const bookingCode = generateBookingCode(now);

      const booking = await tx.booking.create({
        data: {
          bookingCode,
          studentId,
          lecturerId,
          serviceId,
          serviceDurationSnapshot: service.durationMinutes,
          startAt,
          endAt,
          topic,
          additionalNotes: additionalNotes || null,
          status: "PENDING",
          pendingExpiresAt,
        },
        include: {
          service: { select: { id: true, name: true, durationMinutes: true } },
          lecturer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedBy: actor.id,
          reason: "Pengajuan booking baru oleh mahasiswa",
        },
      });

      await recordAuditLog({
        actorUserId: actor.id,
        action: "BOOKING_CREATE",
        entityType: "Booking",
        entityId: booking.id,
        metadata: {
          bookingCode: booking.bookingCode,
          lecturerId,
          serviceId,
          startAt: booking.startAt,
          endAt: booking.endAt,
          durationSnapshot: booking.serviceDurationSnapshot,
        },
        ipAddress,
        tx,
      });

      return booking;
    });

    // Pengiriman notifikasi di luar transaksi agar tidak pernah menggagalkan transaksi booking utama
    await dispatchNotificationsSafe([
      {
        userId: result.lecturer.user.id,
        title: "Permintaan Booking Baru",
        message: `${actor.name} mengajukan ${result.service.name} pada ${formatDateTime(result.startAt, policy.campusTimezone)} (${result.bookingCode}).`,
        type: "BOOKING_CREATED",
        relatedEntityType: "Booking",
        relatedEntityId: result.id,
      },
    ]);

    return result;
  } catch (error) {
    if (isPgExclusionOrSerializationError(error)) {
      throw new ConflictError(
        "Slot waktu tersebut baru saja dipesan oleh pengguna lain. Silakan pilih slot lain."
      );
    }
    throw error;
  }
}

export async function listStudentBookings(params: {
  actor: AuthenticatedUser;
  status?: BookingStatus;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const { actor, status, from, to, page = 1, limit = 20 } = params;
  if (actor.role !== "STUDENT" || !actor.studentProfile) {
    throw new ForbiddenError("Hanya mahasiswa yang dapat mengakses daftar booking mahasiswa.");
  }

  const where: Prisma.BookingWhereInput = {
    studentId: actor.studentProfile.id,
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          startAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, durationMinutes: true } },
        lecturer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        scheduleChangeRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { startAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function listLecturerBookings(params: {
  actor: AuthenticatedUser;
  status?: BookingStatus;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const { actor, status, from, to, page = 1, limit = 20 } = params;
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat mengakses daftar booking dosen.");
  }

  const where: Prisma.BookingWhereInput = {
    lecturerId: actor.lecturerProfile.id,
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          startAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, durationMinutes: true } },
        student: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        consultation: {
          select: {
            id: true,
            followUpDate: true,
            updatedAt: true,
          },
        },
        scheduleChangeRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { startAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getBookingDetailForActor(actor: AuthenticatedUser, bookingId: string) {
  const policy = await getCampusPolicy();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { id: true, name: true, description: true, durationMinutes: true } },
      student: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      lecturer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      consultation: true,
      statusHistories: {
        include: {
          changedByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      scheduleChangeRequests: {
        include: {
          requestedByUser: { select: { id: true, name: true, role: true } },
          decidedByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError("Detail booking tidak ditemukan.");
  }

  if (!canAccessBooking(actor, { studentId: booking.studentId, lecturerId: booking.lecturerId })) {
    throw new ForbiddenError("Anda tidak berhak melihat detail booking ini.");
  }

  const sanitizedConsultation = sanitizeConsultationForActor({
    actor,
    booking: { studentId: booking.studentId, lecturerId: booking.lecturerId },
    consultation: booking.consultation,
    policy,
  });

  const cancelEvaluation = canStudentOwnBooking(actor, booking)
    ? evaluateStudentCancellation(booking, policy)
    : { allowed: false as const, reason: "" };

  return {
    ...booking,
    consultation: sanitizedConsultation,
    policyFlags: {
      canCancel: cancelEvaluation.allowed,
      cancelBlockedReason: cancelEvaluation.allowed ? null : cancelEvaluation.reason,
      canRequestScheduleChange:
        canStudentOwnBooking(actor, booking) &&
        (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
        booking.startAt.getTime() > Date.now() &&
        !booking.scheduleChangeRequests.some((r) => r.status === "PENDING"),
      canDecide:
        canLecturerOwnBooking(actor, booking) && booking.status === "PENDING",
      canCompleteOrNoShow:
        canLecturerOwnBooking(actor, booking) && booking.status === "CONFIRMED",
      canEditConsultation:
        canLecturerOwnBooking(actor, booking) &&
        (booking.status === "CONFIRMED" || booking.status === "COMPLETED"),
      campusTimezone: policy.campusTimezone,
    },
  };
}

export async function approveBooking(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  ipAddress?: string | null;
}) {
  const { actor, bookingId, ipAddress } = params;
  const policy = await getCampusPolicy();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canLecturerOwnBooking(actor, existing)) {
      throw new ForbiddenError("Hanya dosen pemilik jadwal yang dapat menyetujui booking ini.");
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${existing.lecturerId}))`;

    if (
      existing.status === "PENDING" &&
      existing.pendingExpiresAt &&
      existing.pendingExpiresAt.getTime() <= Date.now()
    ) {
      await expireStalePendingBookingsTx(tx, existing.lecturerId);
      throw new DomainError("Permintaan booking telah kedaluwarsa.", 409, "BOOKING_EXPIRED");
    }

    if (!canTransitionBookingStatus(existing.status, "CONFIRMED")) {
      throw new ConflictError("Hanya booking berstatus Menunggu yang dapat disetujui.");
    }

    const saved = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        pendingExpiresAt: null,
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: existing.status,
        toStatus: "CONFIRMED",
        changedBy: actor.id,
        reason: "Disetujui oleh dosen",
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "BOOKING_APPROVE",
      entityType: "Booking",
      entityId: bookingId,
      metadata: {
        bookingCode: existing.bookingCode,
        fromStatus: existing.status,
        toStatus: "CONFIRMED",
      },
      ipAddress,
      tx,
    });

    return { saved, existing };
  });

  await dispatchNotificationsSafe([
    {
      userId: updated.existing.student.user.id,
      title: "Booking Disetujui",
      message: `Booking ${updated.existing.bookingCode} (${updated.existing.service.name}) dengan ${updated.existing.lecturer.user.name} pada ${formatDateTime(updated.existing.startAt, policy.campusTimezone)} telah dikonfirmasi.`,
      type: "BOOKING_APPROVED",
      relatedEntityType: "Booking",
      relatedEntityId: bookingId,
    },
  ]);

  return updated.saved;
}

export async function rejectBooking(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  reason: string;
  ipAddress?: string | null;
}) {
  const { actor, bookingId, reason, ipAddress } = params;
  const policy = await getCampusPolicy();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canLecturerOwnBooking(actor, existing)) {
      throw new ForbiddenError("Hanya dosen pemilik jadwal yang dapat menolak booking ini.");
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${existing.lecturerId}))`;

    if (!canTransitionBookingStatus(existing.status, "REJECTED")) {
      throw new ConflictError("Hanya booking berstatus Menunggu yang dapat ditolak.");
    }

    const saved = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        pendingExpiresAt: null,
      },
    });

    await tx.scheduleChangeRequest.updateMany({
      where: { bookingId, status: "PENDING" },
      data: { status: "CANCELLED", decisionReason: "Booking utama ditolak dosen." },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: existing.status,
        toStatus: "REJECTED",
        changedBy: actor.id,
        reason,
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "BOOKING_REJECT",
      entityType: "Booking",
      entityId: bookingId,
      metadata: {
        bookingCode: existing.bookingCode,
        fromStatus: existing.status,
        toStatus: "REJECTED",
        reason,
      },
      ipAddress,
      tx,
    });

    return { saved, existing };
  });

  await dispatchNotificationsSafe([
    {
      userId: updated.existing.student.user.id,
      title: "Booking Ditolak",
      message: `Booking ${updated.existing.bookingCode} pada ${formatDateTime(updated.existing.startAt, policy.campusTimezone)} ditolak oleh ${updated.existing.lecturer.user.name}. Alasan: ${reason}`,
      type: "BOOKING_REJECTED",
      relatedEntityType: "Booking",
      relatedEntityId: bookingId,
    },
  ]);

  return updated.saved;
}

export async function cancelBooking(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  reason: string;
  ipAddress?: string | null;
}) {
  const { actor, bookingId, reason, ipAddress } = params;
  const policy = await getCampusPolicy();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canStudentOwnBooking(actor, existing)) {
      throw new ForbiddenError("Anda hanya dapat membatalkan booking milik Anda sendiri.");
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${existing.lecturerId}))`;

    const evaluation = evaluateStudentCancellation(existing, policy);
    if (!evaluation.allowed) {
      throw new DomainError(evaluation.reason, 400, "CANCELLATION_NOT_ALLOWED");
    }

    const saved = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        pendingExpiresAt: null,
      },
    });

    await tx.scheduleChangeRequest.updateMany({
      where: { bookingId, status: "PENDING" },
      data: { status: "CANCELLED", decisionReason: "Booking utama dibatalkan mahasiswa." },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        changedBy: actor.id,
        reason,
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "BOOKING_CANCEL",
      entityType: "Booking",
      entityId: bookingId,
      metadata: {
        bookingCode: existing.bookingCode,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        reason,
      },
      ipAddress,
      tx,
    });

    return { saved, existing };
  });

  await dispatchNotificationsSafe([
    {
      userId: updated.existing.lecturer.user.id,
      title: "Booking Dibatalkan Mahasiswa",
      message: `${updated.existing.student.user.name} membatalkan booking ${updated.existing.bookingCode} (${formatDateTime(updated.existing.startAt, policy.campusTimezone)}). Alasan: ${reason}`,
      type: "BOOKING_CANCELLED",
      relatedEntityType: "Booking",
      relatedEntityId: bookingId,
    },
  ]);

  return updated.saved;
}

export async function finalizeBookingStatus(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  targetStatus: "COMPLETED" | "NO_SHOW";
  ipAddress?: string | null;
}) {
  const { actor, bookingId, targetStatus, ipAddress } = params;
  const policy = await getCampusPolicy();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canLecturerOwnBooking(actor, existing)) {
      throw new ForbiddenError("Hanya dosen pemilik jadwal yang dapat memperbarui status konsultasi.");
    }
    if (!canTransitionBookingStatus(existing.status, targetStatus)) {
      throw new ConflictError(
        `Status booking saat ini (${existing.status}) tidak dapat diubah menjadi ${targetStatus}.`
      );
    }

    const saved = await tx.booking.update({
      where: { id: bookingId },
      data: { status: targetStatus },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: existing.status,
        toStatus: targetStatus,
        changedBy: actor.id,
        reason:
          targetStatus === "COMPLETED"
            ? "Konsultasi ditandai selesai oleh dosen"
            : "Mahasiswa ditandai tidak hadir oleh dosen",
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: targetStatus === "COMPLETED" ? "BOOKING_COMPLETE" : "BOOKING_NO_SHOW",
      entityType: "Booking",
      entityId: bookingId,
      metadata: {
        bookingCode: existing.bookingCode,
        fromStatus: existing.status,
        toStatus: targetStatus,
      },
      ipAddress,
      tx,
    });

    return { saved, existing };
  });

  await dispatchNotificationsSafe([
    {
      userId: updated.existing.student.user.id,
      title: targetStatus === "COMPLETED" ? "Konsultasi Selesai" : "Status Konsultasi: Tidak Hadir",
      message:
        targetStatus === "COMPLETED"
          ? `Sesi konsultasi ${updated.existing.bookingCode} (${formatDateTime(updated.existing.startAt, policy.campusTimezone)}) telah ditandai selesai.`
          : `Sesi konsultasi ${updated.existing.bookingCode} (${formatDateTime(updated.existing.startAt, policy.campusTimezone)}) ditandai tidak hadir.`,
      type: targetStatus === "COMPLETED" ? "BOOKING_COMPLETED" : "BOOKING_NO_SHOW",
      relatedEntityType: "Booking",
      relatedEntityId: bookingId,
    },
  ]);

  return updated.saved;
}

