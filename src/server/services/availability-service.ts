import { Prisma, type AvailabilityStatus } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/server/audit/audit-logger";
import {
  ACTIVE_BLOCKING_STATUSES,
  intervalsOverlap,
  isValidTimeRange,
  isWithinInterval,
} from "@/server/policies/booking-policy";
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from "./errors";

function isPgExclusionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as Record<string, unknown> | undefined;
    if (error.code === "P2004" || meta?.code === "23P01") {
      return true;
    }
  }
  if (error instanceof Error && error.message.includes("23P01")) {
    return true;
  }
  return false;
}

export async function listMyAvailabilities(actor: AuthenticatedUser, from?: Date, to?: Date) {
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat mengelola ketersediaan jadwal.");
  }

  return prisma.availability.findMany({
    where: {
      lecturerId: actor.lecturerProfile.id,
      ...(from || to
        ? {
            AND: [
              from ? { endAt: { gt: from } } : {},
              to ? { startAt: { lt: to } } : {},
            ],
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
  });
}

export async function createLecturerAvailability(params: {
  actor: AuthenticatedUser;
  startAt: Date;
  endAt: Date;
  status?: AvailabilityStatus;
  ipAddress?: string | null;
}) {
  const { actor, startAt, endAt, status = "OPEN", ipAddress } = params;
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat menambahkan ketersediaan jadwal.");
  }
  if (!isValidTimeRange(startAt, endAt)) {
    throw new DomainError("Jam mulai harus lebih awal dari jam selesai.", 400, "INVALID_RANGE");
  }

  const lecturerId = actor.lecturerProfile.id;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`avail:${lecturerId}`}))`;

      const existing = await tx.availability.findMany({
        where: {
          lecturerId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (existing.length > 0) {
        throw new ConflictError(
          "Rentang waktu ketersediaan bertabrakan dengan jadwal ketersediaan Anda yang sudah ada."
        );
      }

      const created = await tx.availability.create({
        data: {
          lecturerId,
          startAt,
          endAt,
          status,
        },
      });

      await recordAuditLog({
        actorUserId: actor.id,
        action: "AVAILABILITY_CREATE",
        entityType: "Availability",
        entityId: created.id,
        metadata: { startAt: created.startAt, endAt: created.endAt, status: created.status },
        ipAddress,
        tx,
      });

      return created;
    });
  } catch (error) {
    if (isPgExclusionError(error)) {
      throw new ConflictError("Rentang waktu ketersediaan bertabrakan dengan jadwal yang sudah ada.");
    }
    throw error;
  }
}

export async function updateLecturerAvailability(params: {
  actor: AuthenticatedUser;
  availabilityId: string;
  startAt?: Date;
  endAt?: Date;
  status?: AvailabilityStatus;
  ipAddress?: string | null;
}) {
  const { actor, availabilityId, startAt, endAt, status, ipAddress } = params;
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat mengubah ketersediaan jadwal.");
  }

  const lecturerId = actor.lecturerProfile.id;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`avail:${lecturerId}`}))`;

      const current = await tx.availability.findUnique({
        where: { id: availabilityId },
      });
      if (!current) {
        throw new NotFoundError("Jadwal ketersediaan tidak ditemukan.");
      }
      if (current.lecturerId !== lecturerId) {
        throw new ForbiddenError("Anda tidak berhak mengubah ketersediaan milik dosen lain.");
      }

      const nextStart = startAt ?? current.startAt;
      const nextEnd = endAt ?? current.endAt;
      const nextStatus = status ?? current.status;

      if (!isValidTimeRange(nextStart, nextEnd)) {
        throw new DomainError("Jam mulai harus lebih awal dari jam selesai.", 400, "INVALID_RANGE");
      }

      // Cek overlap dengan ketersediaan lain milik dosen yang sama
      const overlappingOther = await tx.availability.findMany({
        where: {
          lecturerId,
          id: { not: availabilityId },
          startAt: { lt: nextEnd },
          endAt: { gt: nextStart },
        },
        select: { id: true },
      });
      if (overlappingOther.length > 0) {
        throw new ConflictError(
          "Perubahan rentang waktu bertabrakan dengan jadwal ketersediaan Anda yang lain."
        );
      }

      // Lindungi booking aktif yang berada dalam rentang availability ini
      const activeBookings = await tx.booking.findMany({
        where: {
          lecturerId,
          status: { in: [...ACTIVE_BLOCKING_STATUSES] },
          startAt: { lt: current.endAt },
          endAt: { gt: current.startAt },
          OR: [{ pendingExpiresAt: null }, { pendingExpiresAt: { gt: new Date() } }],
        },
        select: { id: true, startAt: true, endAt: true, bookingCode: true },
      });

      if (activeBookings.length > 0) {
        if (nextStatus === "CLOSED") {
          throw new ConflictError(
            "Ketersediaan tidak dapat ditutup karena masih terdapat booking aktif pada slot ini. Selesaikan atau putuskan booking terlebih dahulu."
          );
        }
        const invalidatesBooking = activeBookings.some(
          (b) => !isWithinInterval(b.startAt, b.endAt, nextStart, nextEnd)
        );
        if (invalidatesBooking) {
          throw new ConflictError(
            "Rentang waktu baru tidak mencakup seluruh booking aktif yang sudah ada pada jadwal ini."
          );
        }
      }

      const updated = await tx.availability.update({
        where: { id: availabilityId },
        data: {
          startAt: nextStart,
          endAt: nextEnd,
          status: nextStatus,
        },
      });

      await recordAuditLog({
        actorUserId: actor.id,
        action: "AVAILABILITY_UPDATE",
        entityType: "Availability",
        entityId: updated.id,
        metadata: { startAt: updated.startAt, endAt: updated.endAt, status: updated.status },
        ipAddress,
        tx,
      });

      return updated;
    });
  } catch (error) {
    if (isPgExclusionError(error)) {
      throw new ConflictError("Perubahan waktu bertabrakan dengan jadwal ketersediaan lain.");
    }
    throw error;
  }
}

export async function deleteLecturerAvailability(params: {
  actor: AuthenticatedUser;
  availabilityId: string;
  ipAddress?: string | null;
}) {
  const { actor, availabilityId, ipAddress } = params;
  if (actor.role !== "LECTURER" || !actor.lecturerProfile) {
    throw new ForbiddenError("Hanya dosen yang dapat menghapus ketersediaan jadwal.");
  }

  const lecturerId = actor.lecturerProfile.id;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`avail:${lecturerId}`}))`;

    const current = await tx.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!current) {
      throw new NotFoundError("Jadwal ketersediaan tidak ditemukan.");
    }
    if (current.lecturerId !== lecturerId) {
      throw new ForbiddenError("Anda tidak berhak menghapus ketersediaan milik dosen lain.");
    }

    const activeBookings = await tx.booking.findMany({
      where: {
        lecturerId,
        status: { in: [...ACTIVE_BLOCKING_STATUSES] },
        startAt: { lt: current.endAt },
        endAt: { gt: current.startAt },
        OR: [{ pendingExpiresAt: null }, { pendingExpiresAt: { gt: new Date() } }],
      },
      select: { id: true, startAt: true, endAt: true },
    });

    const hasOverlappingBooking = activeBookings.some((b) =>
      intervalsOverlap(current.startAt, current.endAt, b.startAt, b.endAt)
    );
    if (hasOverlappingBooking) {
      throw new ConflictError(
        "Jadwal ketersediaan tidak dapat dihapus karena masih memiliki booking aktif."
      );
    }

    await tx.availability.delete({
      where: { id: availabilityId },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "AVAILABILITY_DELETE",
      entityType: "Availability",
      entityId: availabilityId,
      metadata: { startAt: current.startAt, endAt: current.endAt },
      ipAddress,
      tx,
    });

    return { deleted: true, id: availabilityId };
  });
}

