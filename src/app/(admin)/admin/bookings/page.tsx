import { Suspense } from "react";
import { AdminBookingsClient } from "@/features/admin/admin-bookings-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function AdminBookingsContent() {
  await requirePageUser(["ADMIN"]);
  const policy = await getCampusPolicy();
  return <AdminBookingsClient timezone={policy.campusTimezone} />;
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminBookingsContent />
    </Suspense>
  );
}

