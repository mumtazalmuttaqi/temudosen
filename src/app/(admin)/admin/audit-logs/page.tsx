import { Suspense } from "react";
import { AuditLogsClient } from "@/features/admin/audit-logs-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function AdminAuditLogsContent() {
  await requirePageUser(["ADMIN"]);
  const policy = await getCampusPolicy();
  return <AuditLogsClient timezone={policy.campusTimezone} />;
}

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminAuditLogsContent />
    </Suspense>
  );
}

