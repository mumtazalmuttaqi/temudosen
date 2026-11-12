import { Suspense } from "react";
import { ProfileSettingsView } from "@/components/shared/profile-settings-view";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function StudentProfileContent() {
  const user = await requirePageUser(["STUDENT"]);
  return <ProfileSettingsView user={user} />;
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentProfileContent />
    </Suspense>
  );
}

