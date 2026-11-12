import { Suspense } from "react";
import { LecturerDirectoryClient } from "@/features/lecturers/lecturer-directory-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturersPageContent() {
  await requirePageUser(["STUDENT"]);
  const [policy, services, lecturerFaculties] = await Promise.all([
    getCampusPolicy(),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true },
    }),
    prisma.lecturerProfile.findMany({
      select: { faculty: true },
      distinct: ["faculty"],
      orderBy: { faculty: "asc" },
    }),
  ]);

  return (
    <LecturerDirectoryClient
      services={services}
      faculties={lecturerFaculties.map((f) => f.faculty)}
      timezone={policy.campusTimezone}
    />
  );
}

export default function StudentLecturersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturersPageContent />
    </Suspense>
  );
}

