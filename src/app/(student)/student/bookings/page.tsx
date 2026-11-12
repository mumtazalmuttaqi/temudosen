import { Suspense } from "react";
import { StudentBookingsClient } from "@/features/bookings/student-bookings-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function StudentBookingsPageContent() {
  await requirePageUser(["STUDENT"]);
  const policy = await getCampusPolicy();
  return <StudentBookingsClient timezone={policy.campusTimezone} />;
}

export default function StudentBookingsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentBookingsPageContent />
    </Suspense>
  );
}

