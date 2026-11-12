import { Suspense } from "react";
import { UsersManagerClient } from "@/features/admin/users-manager-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminLecturersContent() {
  await requirePageUser(["ADMIN"]);
  return <UsersManagerClient fixedRole="LECTURER" />;
}

export default function AdminLecturersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminLecturersContent />
    </Suspense>
  );
}

