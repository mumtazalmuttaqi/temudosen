import { Suspense } from "react";
import { LecturerCalendarClient } from "@/features/lecturer/lecturer-calendar-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerCalendarContent() {
  await requirePageUser(["LECTURER"]);
  const policy = await getCampusPolicy();
  return <LecturerCalendarClient timezone={policy.campusTimezone} />;
}

export default function LecturerCalendarPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerCalendarContent />
    </Suspense>
  );
}

