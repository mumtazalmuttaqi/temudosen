import { Suspense } from "react";
import { NotificationsView } from "@/components/shared/notifications-view";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerNotificationsContent() {
  await requirePageUser(["LECTURER"]);
  const policy = await getCampusPolicy();
  return <NotificationsView rolePrefix="/lecturer" timezone={policy.campusTimezone} />;
}

export default function LecturerNotificationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerNotificationsContent />
    </Suspense>
  );
}

