import { Suspense } from "react";
import { ReportsClient } from "@/features/admin/reports-client";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminReportsContent() {
  await requirePageUser(["ADMIN"]);
  const [lecturers, services] = await Promise.all([
    prisma.lecturerProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ReportsClient
      lecturers={lecturers.map((l) => ({ id: l.id, name: l.user.name }))}
      services={services}
    />
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminReportsContent />
    </Suspense>
  );
}

