import { Suspense } from "react";
import { UsersManagerClient } from "@/features/admin/users-manager-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminStudentsContent() {
  await requirePageUser(["ADMIN"]);
  return <UsersManagerClient fixedRole="STUDENT" />;
}

export default function AdminStudentsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminStudentsContent />
    </Suspense>
  );
}

