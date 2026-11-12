import { Suspense } from "react";
import { ServicesManagerClient } from "@/features/admin/services-manager-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminServicesContent() {
  await requirePageUser(["ADMIN"]);
  return <ServicesManagerClient />;
}

export default function AdminServicesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminServicesContent />
    </Suspense>
  );
}

