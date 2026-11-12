import { Suspense } from "react";
import { NotificationsView } from "@/components/shared/notifications-view";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function StudentNotificationsContent() {
  await requirePageUser(["STUDENT"]);
  const policy = await getCampusPolicy();
  return <NotificationsView rolePrefix="/student" timezone={policy.campusTimezone} />;
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentNotificationsContent />
    </Suspense>
  );
}

