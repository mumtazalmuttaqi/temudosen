import type { BookingStatus } from "@prisma/client";

export interface CampusPolicy {
  pendingHoldHours: number;
  cancellationCutoffHours: number;
  allowStudentCancelConfirmed: boolean;
  confirmedCancelRequiresApproval: boolean;
  scheduleChangeApprover: "LECTURER" | "ADMIN";
  studentCanViewAllNotes: boolean;
  adminCanViewPrivateNotes: boolean;
  campusTimezone: string;
  allowOpenStudentRegistration: boolean;
}

export const DEFAULT_CAMPUS_POLICY: CampusPolicy = {
  pendingHoldHours: Number(process.env.DEFAULT_PENDING_HOLD_HOURS || "24"),
  cancellationCutoffHours: Number(process.env.DEFAULT_CANCELLATION_CUTOFF_HOURS || "12"),
  allowStudentCancelConfirmed: true,
  confirmedCancelRequiresApproval: false,
  scheduleChangeApprover: "LECTURER",
  studentCanViewAllNotes: false,
  adminCanViewPrivateNotes: false,
  campusTimezone: process.env.DEFAULT_CAMPUS_TIMEZONE || "Asia/Jakarta",
  allowOpenStudentRegistration: true,
};

export const ACTIVE_BLOCKING_STATUSES: readonly BookingStatus[] = ["PENDING", "CONFIRMED"];
export const TERMINAL_BOOKING_STATUSES: readonly BookingStatus[] = [
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function isValidTimeRange(startAt: Date, endAt: Date): boolean {
  return !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && startAt.getTime() < endAt.getTime();
}

/**
 * Aturan irisan interval wajib: A.start < B.end AND A.end > B.start
 */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function isWithinInterval(
  innerStart: Date,
  innerEnd: Date,
  outerStart: Date,
  outerEnd: Date
): boolean {
  return innerStart.getTime() >= outerStart.getTime() && innerEnd.getTime() <= outerEnd.getTime();
}

export function isTerminalStatus(status: BookingStatus): boolean {
  return TERMINAL_BOOKING_STATUSES.includes(status);
}

export function isBookingBlockingSlot(
  booking: { status: BookingStatus; pendingExpiresAt?: Date | null },
  now = new Date()
): boolean {
  if (!ACTIVE_BLOCKING_STATUSES.includes(booking.status)) {
    return false;
  }
  if (
    booking.status === "PENDING" &&
    booking.pendingExpiresAt &&
    booking.pendingExpiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }
  return true;
}

export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_BOOKING_TRANSITIONS[from].includes(to);
}

export function evaluateStudentCancellation(
  booking: { status: BookingStatus; startAt: Date },
  policy: CampusPolicy,
  now = new Date()
): { allowed: true } | { allowed: false; reason: string } {
  if (isTerminalStatus(booking.status)) {
    return { allowed: false, reason: "Booking dengan status akhir tidak dapat dibatalkan." };
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { allowed: false, reason: "Status booking tidak mengizinkan pembatalan." };
  }
  if (booking.startAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "Jadwal konsultasi sudah dimulai atau terlewat." };
  }
  if (booking.status === "CONFIRMED" && !policy.allowStudentCancelConfirmed) {
    return {
      allowed: false,
      reason: "Kebijakan kampus tidak mengizinkan mahasiswa membatalkan booking terkonfirmasi.",
    };
  }
  if (booking.status === "CONFIRMED" && policy.confirmedCancelRequiresApproval) {
    return {
      allowed: false,
      reason: "Pembatalan booking yang telah dikonfirmasi memerlukan persetujuan dosen.",
    };
  }

  const diffMs = booking.startAt.getTime() - now.getTime();
  const cutoffMs = policy.cancellationCutoffHours * 60 * 60 * 1000;
  if (diffMs < cutoffMs) {
    return {
      allowed: false,
      reason: `Pembatalan hanya dapat dilakukan minimal ${policy.cancellationCutoffHours} jam sebelum jadwal konsultasi.`,
    };
  }

  return { allowed: true };
}

export function evaluateScheduleChangeRequest(
  booking: { status: BookingStatus; startAt: Date },
  now = new Date()
): { allowed: true } | { allowed: false; reason: string } {
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return {
      allowed: false,
      reason: "Perubahan jadwal hanya dapat diajukan untuk booking berstatus Menunggu atau Dikonfirmasi.",
    };
  }
  if (booking.startAt.getTime() <= now.getTime()) {
    return {
      allowed: false,
      reason: "Jadwal yang sudah dimulai atau lewat tidak dapat diajukan perubahannya.",
    };
  }
  return { allowed: true };
}

export interface TimeWindow {
  startAt: Date;
  endAt: Date;
}

export interface GeneratedSlot {
  startAt: string;
  endAt: string;
}

export function generateBookableSlots(params: {
  availabilities: Array<{ id: string; startAt: Date; endAt: Date; status: "OPEN" | "CLOSED" }>;
  blockingBookings: Array<{
    startAt: Date;
    endAt: Date;
    status: BookingStatus;
    pendingExpiresAt?: Date | null;
  }>;
  durationMinutes: number;
  now?: Date;
}): GeneratedSlot[] {
  const now = params.now ?? new Date();
  const durationMs = params.durationMinutes * 60 * 1000;
  if (durationMs <= 0) return [];

  const stepMinutes =
    params.durationMinutes % 30 === 0
      ? 30
      : params.durationMinutes % 15 === 0
        ? 15
        : params.durationMinutes;
  const stepMs = stepMinutes * 60 * 1000;

  const activeBookings = params.blockingBookings.filter((b) => isBookingBlockingSlot(b, now));
  const slots: GeneratedSlot[] = [];
  const seen = new Set<string>();

  const openWindows = params.availabilities
    .filter((a) => a.status === "OPEN")
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  for (const window of openWindows) {
    let cursor = window.startAt.getTime();
    const limit = window.endAt.getTime();

    while (cursor + durationMs <= limit) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);

      if (slotStart.getTime() > now.getTime()) {
        const hasConflict = activeBookings.some((b) =>
          intervalsOverlap(slotStart, slotEnd, b.startAt, b.endAt)
        );
        if (!hasConflict) {
          const key = slotStart.toISOString();
          if (!seen.has(key)) {
            seen.add(key);
            slots.push({
              startAt: key,
              endAt: slotEnd.toISOString(),
            });
          }
        }
      }

      cursor += stepMs;
    }
  }

  return slots;
}

