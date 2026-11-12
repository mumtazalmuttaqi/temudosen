import { Suspense } from "react";
import { SettingsClient } from "@/features/admin/settings-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { ensureSystemSettings } from "@/server/policies/settings-service";

async function AdminSettingsContent() {
  await requirePageUser(["ADMIN"]);
  const settings = await ensureSystemSettings();
  return <SettingsClient initialSettings={settings} />;
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminSettingsContent />
    </Suspense>
  );
}

