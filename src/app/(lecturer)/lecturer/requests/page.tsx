import { Suspense } from "react";
import { LecturerRequestsClient } from "@/features/lecturer/lecturer-requests-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerRequestsContent() {
  await requirePageUser(["LECTURER"]);
  const policy = await getCampusPolicy();
  return <LecturerRequestsClient timezone={policy.campusTimezone} />;
}

export default function LecturerRequestsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerRequestsContent />
    </Suspense>
  );
}

