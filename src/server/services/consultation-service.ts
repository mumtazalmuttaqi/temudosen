import type { AuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { UpsertConsultationInput } from "@/lib/validations/consultation";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { dispatchNotificationsSafe } from "@/server/notifications/dispatcher";
import {
  canLecturerOwnBooking,
  sanitizeConsultationForActor,
} from "@/server/policies/access-policy";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

export async function upsertConsultationNotes(params: {
  actor: AuthenticatedUser;
  bookingId: string;
  input: UpsertConsultationInput;
  ipAddress?: string | null;
}) {
  const { actor, bookingId, input, ipAddress } = params;
  const policy = await getCampusPolicy();

  const saved = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!booking) {
      throw new NotFoundError("Booking tidak ditemukan.");
    }
    if (!canLecturerOwnBooking(actor, booking)) {
      throw new ForbiddenError("Hanya dosen pemilik konsultasi yang dapat mengisi catatan.");
    }
    if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
      throw new ConflictError(
        "Catatan konsultasi hanya dapat diisi pada booking yang Dikonfirmasi atau Selesai."
      );
    }

    const followUpDate = input.followUpDate ? new Date(input.followUpDate) : null;

    const consultation = await tx.consultation.upsert({
      where: { bookingId },
      update: {
        privateNotes: input.privateNotes ?? null,
        studentVisibleNotes: input.studentVisibleNotes ?? null,
        recommendations: input.recommendations ?? null,
        followUpDate,
      },
      create: {
        bookingId,
        privateNotes: input.privateNotes ?? null,
        studentVisibleNotes: input.studentVisibleNotes ?? null,
        recommendations: input.recommendations ?? null,
        followUpDate,
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "CONSULTATION_NOTES_UPSERT",
      entityType: "Consultation",
      entityId: consultation.id,
      metadata: {
        bookingId,
        bookingCode: booking.bookingCode,
        hasVisibleNotes: Boolean(input.studentVisibleNotes),
        hasFollowUpDate: Boolean(followUpDate),
      },
      ipAddress,
      tx,
    });

    return { consultation, booking };
  });

  if (input.studentVisibleNotes || input.recommendations) {
    await dispatchNotificationsSafe([
      {
        userId: saved.booking.student.user.id,
        title: "Catatan Bimbingan Diperbarui",
        message: `${saved.booking.lecturer.user.name} menambahkan catatan dan rekomendasi untuk sesi ${saved.booking.bookingCode}.`,
        type: "CONSULTATION_UPDATED",
        relatedEntityType: "Booking",
        relatedEntityId: bookingId,
      },
    ]);
  }

  return sanitizeConsultationForActor({
    actor,
    booking: saved.booking,
    consultation: saved.consultation,
    policy,
  });
}

export async function listStudentConsultationHistory(actor: AuthenticatedUser) {
  if (actor.role !== "STUDENT" || !actor.studentProfile) {
    throw new ForbiddenError("Hanya mahasiswa yang dapat melihat riwayat bimbingan mahasiswa.");
  }

  const policy = await getCampusPolicy();
  const bookings = await prisma.booking.findMany({
    where: {
      studentId: actor.studentProfile.id,
      status: { in: ["COMPLETED", "NO_SHOW"] },
    },
    include: {
      service: { select: { id: true, name: true, durationMinutes: true } },
      lecturer: {
        include: { user: { select: { id: true, name: true } } },
      },
      consultation: true,
    },
    orderBy: { startAt: "desc" },
  });

  return bookings.map((b) => ({
    ...b,
    consultation: sanitizeConsultationForActor({
      actor,
      booking: b,
      consultation: b.consultation,
      policy,
    }),
  }));
}

export async function listLecturerConsultationHistory(actor: AuthenticatedUser) {
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat melihat riwayat mahasiswa bimbingan.");
  }

  return prisma.booking.findMany({
    where: {
      lecturerId: actor.lecturerProfile.id,
      status: { in: ["COMPLETED", "NO_SHOW"] },
    },
    include: {
      service: { select: { id: true, name: true, durationMinutes: true } },
      student: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      consultation: true,
    },
    orderBy: { startAt: "desc" },
  });
}

