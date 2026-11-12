import type { UserRole } from "@prisma/client";
import type { CampusPolicy } from "./booking-policy";

export interface AccessActor {
  id: string;
  role: UserRole;
  studentProfile?: { id: string } | null;
  lecturerProfile?: { id: string } | null;
}

export interface BookingOwnershipTarget {
  studentId: string;
  lecturerId: string;
}

export function canAccessBooking(
  actor: AccessActor,
  booking: BookingOwnershipTarget
): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }
  if (actor.role === "STUDENT") {
    return Boolean(actor.studentProfile && actor.studentProfile.id === booking.studentId);
  }
  if (actor.role === "LECTURER") {
    return Boolean(actor.lecturerProfile && actor.lecturerProfile.id === booking.lecturerId);
  }
  return false;
}

export function canStudentOwnBooking(
  actor: AccessActor,
  booking: BookingOwnershipTarget
): boolean {
  return (
    actor.role === "STUDENT" &&
    Boolean(actor.studentProfile && actor.studentProfile.id === booking.studentId)
  );
}

export function canLecturerOwnBooking(
  actor: AccessActor,
  booking: BookingOwnershipTarget
): boolean {
  return (
    actor.role === "LECTURER" &&
    Boolean(actor.lecturerProfile && actor.lecturerProfile.id === booking.lecturerId)
  );
}

export function canDecideScheduleChange(
  actor: AccessActor,
  booking: BookingOwnershipTarget,
  policy: CampusPolicy
): boolean {
  if (policy.scheduleChangeApprover === "ADMIN") {
    return actor.role === "ADMIN";
  }
  return canLecturerOwnBooking(actor, booking);
}

export function canViewPrivateNotes(
  actor: AccessActor,
  booking: BookingOwnershipTarget,
  policy: CampusPolicy
): boolean {
  if (canLecturerOwnBooking(actor, booking)) {
    return true;
  }
  if (actor.role === "ADMIN") {
    return policy.adminCanViewPrivateNotes;
  }
  if (canStudentOwnBooking(actor, booking)) {
    return policy.studentCanViewAllNotes;
  }
  return false;
}

export interface RawConsultation {
  id: string;
  bookingId: string;
  privateNotes: string | null;
  studentVisibleNotes: string | null;
  recommendations: string | null;
  followUpDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedConsultation {
  id: string;
  bookingId: string;
  privateNotes: string | null;
  studentVisibleNotes: string | null;
  recommendations: string | null;
  followUpDate: Date | null;
  canViewPrivateNotes: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeConsultationForActor(params: {
  actor: AccessActor;
  booking: BookingOwnershipTarget;
  consultation: RawConsultation | null;
  policy: CampusPolicy;
}): SanitizedConsultation | null {
  const { actor, booking, consultation, policy } = params;
  if (!consultation) return null;

  const allowPrivate = canViewPrivateNotes(actor, booking, policy);
  return {
    id: consultation.id,
    bookingId: consultation.bookingId,
    privateNotes: allowPrivate ? consultation.privateNotes : null,
    studentVisibleNotes: consultation.studentVisibleNotes,
    recommendations: consultation.recommendations,
    followUpDate: consultation.followUpDate,
    canViewPrivateNotes: allowPrivate,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
  };
}

