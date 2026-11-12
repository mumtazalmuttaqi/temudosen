import { prisma } from "@/lib/db/prisma";
import { DEFAULT_CAMPUS_POLICY, type CampusPolicy } from "./booking-policy";

export async function getCampusPolicy(): Promise<CampusPolicy> {
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    return DEFAULT_CAMPUS_POLICY;
  }

  return {
    pendingHoldHours: settings.pendingHoldHours,
    cancellationCutoffHours: settings.cancellationCutoffHours,
    allowStudentCancelConfirmed: settings.allowStudentCancelConfirmed,
    confirmedCancelRequiresApproval: settings.confirmedCancelRequiresApproval,
    scheduleChangeApprover:
      settings.scheduleChangeApprover === "ADMIN" ? "ADMIN" : "LECTURER",
    studentCanViewAllNotes: settings.studentCanViewAllNotes,
    adminCanViewPrivateNotes: settings.adminCanViewPrivateNotes,
    campusTimezone: settings.campusTimezone || DEFAULT_CAMPUS_POLICY.campusTimezone,
    allowOpenStudentRegistration: settings.allowOpenStudentRegistration,
  };
}

export async function ensureSystemSettings(): Promise<CampusPolicy> {
  const row = await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pendingHoldHours: DEFAULT_CAMPUS_POLICY.pendingHoldHours,
      cancellationCutoffHours: DEFAULT_CAMPUS_POLICY.cancellationCutoffHours,
      allowStudentCancelConfirmed: DEFAULT_CAMPUS_POLICY.allowStudentCancelConfirmed,
      confirmedCancelRequiresApproval: DEFAULT_CAMPUS_POLICY.confirmedCancelRequiresApproval,
      scheduleChangeApprover: DEFAULT_CAMPUS_POLICY.scheduleChangeApprover,
      studentCanViewAllNotes: DEFAULT_CAMPUS_POLICY.studentCanViewAllNotes,
      adminCanViewPrivateNotes: DEFAULT_CAMPUS_POLICY.adminCanViewPrivateNotes,
      campusTimezone: DEFAULT_CAMPUS_POLICY.campusTimezone,
      allowOpenStudentRegistration: DEFAULT_CAMPUS_POLICY.allowOpenStudentRegistration,
    },
  });

  return {
    pendingHoldHours: row.pendingHoldHours,
    cancellationCutoffHours: row.cancellationCutoffHours,
    allowStudentCancelConfirmed: row.allowStudentCancelConfirmed,
    confirmedCancelRequiresApproval: row.confirmedCancelRequiresApproval,
    scheduleChangeApprover: row.scheduleChangeApprover === "ADMIN" ? "ADMIN" : "LECTURER",
    studentCanViewAllNotes: row.studentCanViewAllNotes,
    adminCanViewPrivateNotes: row.adminCanViewPrivateNotes,
    campusTimezone: row.campusTimezone,
    allowOpenStudentRegistration: row.allowOpenStudentRegistration,
  };
}

