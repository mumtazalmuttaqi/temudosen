import { Suspense } from "react";
import { LecturerAvailabilitiesClient } from "@/features/lecturer/lecturer-availabilities-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerAvailabilitiesContent() {
  await requirePageUser(["LECTURER"]);
  const policy = await getCampusPolicy();
  return <LecturerAvailabilitiesClient timezone={policy.campusTimezone} />;
}

export default function LecturerAvailabilitiesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerAvailabilitiesContent />
    </Suspense>
  );
}

