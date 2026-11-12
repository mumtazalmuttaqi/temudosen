import { Suspense } from "react";
import { ProfileSettingsView } from "@/components/shared/profile-settings-view";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";

async function LecturerProfileContent() {
  const user = await requirePageUser(["LECTURER"]);
  const [services, lecturerServices] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true },
    }),
    user.lecturerProfile
      ? prisma.lecturerService.findMany({
          where: { lecturerId: user.lecturerProfile.id },
          select: { serviceId: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <ProfileSettingsView
      user={user}
      allServices={services}
      selectedServiceIds={lecturerServices.map((ls) => ls.serviceId)}
    />
  );
}

export default function LecturerProfilePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerProfileContent />
    </Suspense>
  );
}

