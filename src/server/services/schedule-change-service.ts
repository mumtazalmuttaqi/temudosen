import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { dispatchNotificationsSafe } from "@/server/notifications/dispatcher";
import { canDecideScheduleChange, canStudentOwnBooking } from "@/server/policies/access-policy";
import {
  ACTIVE_BLOCKING_STATUSES,
  evaluateScheduleChangeRequest,
  isWithinInterval,
} from "@/server/policies/booking-policy";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from "./errors";

export async function createScheduleChangeRequest(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  proposedStartAt: Date;
  reason: string;
  ipAddress?: string | null;
}) {
  const { actor, bookingId, proposedStartAt, reason, ipAddress } = params;
  const now = new Date();
  if (Number.isNaN(proposedStartAt.getTime()) || proposedStartAt.getTime() <= now.getTime()) {
    throw new DomainError("Waktu usulan perubahan jadwal harus berada di masa mendatang.", 400, "PAST_SLOT");
  }

  const policy = await getCampusPolicy();

  const created = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        lecturer: { include: { user: { select: { id: true, name: true } } } },
        student: { include: { user: { select: { id: true, name: true } } } },
        service: { select: { name: true } },
      },
    });
    if (!booking) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canStudentOwnBooking(actor, booking)) {
      throw new ForbiddenError("Anda hanya dapat mengajukan perubahan jadwal untuk booking milik Anda.");
    }

    const evalResult = evaluateScheduleChangeRequest(booking, now);
    if (!evalResult.allowed) {
      throw new DomainError(evalResult.reason, 400, "SCHEDULE_CHANGE_NOT_ALLOWED");
    }

    const existingPending = await tx.scheduleChangeRequest.findFirst({
      where: { bookingId, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) {
      throw new ConflictError("Sudah ada permintaan perubahan jadwal yang masih menunggu keputusan.");
    }

    const proposedEndAt = new Date(
      proposedStartAt.getTime() + booking.serviceDurationSnapshot * 60_000
    );

    // Validasi ketersediaan dosen & bentrok slot pada waktu usulan
    const matchingAvail = await tx.availability.findFirst({
      where: {
        lecturerId: booking.lecturerId,
        status: "OPEN",
        startAt: { lte: proposedStartAt },
        endAt: { gte: proposedEndAt },
      },
    });
    if (!matchingAvail || !isWithinInterval(proposedStartAt, proposedEndAt, matchingAvail.startAt, matchingAvail.endAt)) {
      throw new DomainError(
        "Waktu usulan berada di luar ketersediaan jadwal dosen.",
        400,
        "OUTSIDE_AVAILABILITY"
      );
    }

    const conflict = await tx.booking.findFirst({
      where: {
        lecturerId: booking.lecturerId,
        id: { not: bookingId },
        status: { in: [...ACTIVE_BLOCKING_STATUSES] },
        startAt: { lt: proposedEndAt },
        endAt: { gt: proposedStartAt },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictError("Waktu usulan bertabrakan dengan jadwal booking lain.");
    }

    const req = await tx.scheduleChangeRequest.create({
      data: {
        bookingId,
        requestedByUserId: actor.id,
        proposedStartAt,
        proposedEndAt,
        reason,
        status: "PENDING",
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "SCHEDULE_CHANGE_REQUEST_CREATE",
      entityType: "ScheduleChangeRequest",
      entityId: req.id,
      metadata: {
        bookingId,
        bookingCode: booking.bookingCode,
        proposedStartAt,
        proposedEndAt,
      },
      ipAddress,
      tx,
    });

    return { req, booking };
  });

  // Kirim notifikasi ke pihak yang berwenang (dosen atau admin sesuai konfigurasi)
  const recipients: string[] = [];
  if (policy.scheduleChangeApprover === "ADMIN") {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    recipients.push(...admins.map((a) => a.id));
  } else {
    recipients.push(created.booking.lecturer.user.id);
  }

  await dispatchNotificationsSafe(
    recipients.map((userId) => ({
      userId,
      title: "Permintaan Perubahan Jadwal",
      message: `${created.booking.student.user.name} mengusulkan perubahan jadwal ${created.booking.bookingCode} ke ${formatDateTime(created.req.proposedStartAt, policy.campusTimezone)}.`,
      type: "SCHEDULE_CHANGE_REQUESTED",
      relatedEntityType: "Booking",
      relatedEntityId: created.booking.id,
    }))
  );

  return created.req;
}

export async function approveScheduleChangeRequest(params: {
  actor: AuthenticatedUser;
  requestId: string;
  decisionReason?: string | null;
  ipAddress?: string | null;
}) {
  const { actor, requestId, decisionReason, ipAddress } = params;
  const policy = await getCampusPolicy();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.scheduleChangeRequest.findUnique({
        where: { id: requestId },
        include: {
          booking: {
            include: {
              student: { include: { user: { select: { id: true, name: true } } } },
              lecturer: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
      });
      if (!req) {
        throw new NotFoundError("Permintaan perubahan jadwal tidak ditemukan.");
      }

      if (!canDecideScheduleChange(actor, req.booking, policy)) {
        throw new ForbiddenError("Anda tidak berwenang memutuskan permintaan perubahan jadwal ini.");
      }
      if (req.status !== "PENDING") {
        throw new ConflictError("Permintaan perubahan jadwal sudah diputuskan sebelumnya.");
      }
      if (req.booking.status !== "PENDING" && req.booking.status !== "CONFIRMED") {
        throw new ConflictError("Booking sudah berstatus akhir dan jadwalnya tidak dapat diubah.");
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.booking.lecturerId}))`;

      const avail = await tx.availability.findFirst({
        where: {
          lecturerId: req.booking.lecturerId,
          status: "OPEN",
          startAt: { lte: req.proposedStartAt },
          endAt: { gte: req.proposedEndAt },
        },
      });
      if (!avail) {
        throw new ConflictError(
          "Jadwal usulan tidak lagi berada dalam rentang ketersediaan terbuka dosen."
        );
      }

      const conflict = await tx.booking.findFirst({
        where: {
          lecturerId: req.booking.lecturerId,
          id: { not: req.bookingId },
          status: { in: [...ACTIVE_BLOCKING_STATUSES] },
          startAt: { lt: req.proposedEndAt },
          endAt: { gt: req.proposedStartAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictError("Slot usulan kini sudah terisi oleh booking lain.");
      }

      const updatedBooking = await tx.booking.update({
        where: { id: req.bookingId },
        data: {
          startAt: req.proposedStartAt,
          endAt: req.proposedEndAt,
        },
      });

      const updatedReq = await tx.scheduleChangeRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          decisionReason: decisionReason || "Permintaan perubahan jadwal disetujui.",
          decidedBy: actor.id,
          decidedAt: new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: req.bookingId,
          fromStatus: req.booking.status,
          toStatus: req.booking.status,
          changedBy: actor.id,
          reason: `Perubahan jadwal disetujui ke ${req.proposedStartAt.toISOString()}`,
        },
      });

      await recordAuditLog({
        actorUserId: actor.id,
        action: "SCHEDULE_CHANGE_APPROVE",
        entityType: "ScheduleChangeRequest",
        entityId: requestId,
        metadata: {
          bookingId: req.bookingId,
          bookingCode: req.booking.bookingCode,
          newStartAt: req.proposedStartAt,
          newEndAt: req.proposedEndAt,
        },
        ipAddress,
        tx,
      });

      return { updatedReq, updatedBooking, req };
    });

    await dispatchNotificationsSafe([
      {
        userId: updated.req.booking.student.user.id,
        title: "Perubahan Jadwal Disetujui",
        message: `Permintaan perubahan jadwal untuk booking ${updated.req.booking.bookingCode} disetujui menjadi ${formatDateTime(updated.updatedBooking.startAt, policy.campusTimezone)}.`,
        type: "SCHEDULE_CHANGE_APPROVED",
        relatedEntityType: "Booking",
        relatedEntityId: updated.req.bookingId,
      },
    ]);

    return updated.updatedReq;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004") {
      throw new ConflictError("Slot jadwal usulan bentrok dengan booking aktif lain.");
    }
    throw error;
  }
}

export async function rejectScheduleChangeRequest(params: {
  actor: AuthenticatedUser;
  requestId: string;
  decisionReason: string;
  ipAddress?: string | null;
}) {
  const { actor, requestId, decisionReason, ipAddress } = params;
  const policy = await getCampusPolicy();

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.scheduleChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: {
          include: {
            student: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!req) {
      throw new NotFoundError("Permintaan perubahan jadwal tidak ditemukan.");
    }
    if (!canDecideScheduleChange(actor, req.booking, policy)) {
      throw new ForbiddenError("Anda tidak berwenang memutuskan permintaan perubahan jadwal ini.");
    }
    if (req.status !== "PENDING") {
      throw new ConflictError("Permintaan perubahan jadwal sudah diputuskan sebelumnya.");
    }

    const updatedReq = await tx.scheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        decisionReason,
        decidedBy: actor.id,
        decidedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "SCHEDULE_CHANGE_REJECT",
      entityType: "ScheduleChangeRequest",
      entityId: requestId,
      metadata: {
        bookingId: req.bookingId,
        bookingCode: req.booking.bookingCode,
        decisionReason,
      },
      ipAddress,
      tx,
    });

    return { updatedReq, req };
  });

  await dispatchNotificationsSafe([
    {
      userId: updated.req.booking.student.user.id,
      title: "Perubahan Jadwal Ditolak",
      message: `Permintaan perubahan jadwal untuk booking ${updated.req.booking.bookingCode} ditolak. Alasan: ${decisionReason}`,
      type: "SCHEDULE_CHANGE_REJECTED",
      relatedEntityType: "Booking",
      relatedEntityId: updated.req.bookingId,
    },
  ]);

  return updated.updatedReq;
}

