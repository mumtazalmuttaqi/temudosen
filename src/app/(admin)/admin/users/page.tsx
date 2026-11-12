import { Suspense } from "react";
import { UsersManagerClient } from "@/features/admin/users-manager-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminUsersContent() {
  await requirePageUser(["ADMIN"]);
  return <UsersManagerClient />;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminUsersContent />
    </Suspense>
  );
}

