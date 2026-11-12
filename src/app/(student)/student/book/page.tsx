import { Suspense } from "react";
import { BookingWizard } from "@/features/bookings/booking-wizard";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function StudentBookContent({
  searchParams,
}: {
  searchParams: Promise<{ lecturerId?: string; serviceId?: string; startAt?: string }>;
}) {
  await requirePageUser(["STUDENT"]);
  const sp = await searchParams;

  const [policy, lecturers, services] = await Promise.all([
    getCampusPolicy(),
    prisma.lecturerProfile.findMany({
      where: { user: { status: "ACTIVE", role: "LECTURER" } },
      include: {
        user: { select: { name: true } },
        lecturerServices: { select: { serviceId: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, durationMinutes: true },
    }),
  ]);

  return (
    <BookingWizard
      lecturers={lecturers.map((l) => ({
        id: l.id,
        name: l.user.name,
        faculty: l.faculty,
        expertise: l.expertise,
        serviceIds: l.lecturerServices.map((ls) => ls.serviceId),
      }))}
      services={services}
      initialLecturerId={sp.lecturerId}
      initialServiceId={sp.serviceId}
      initialStartAt={sp.startAt}
      timezone={policy.campusTimezone}
      pendingHoldHours={policy.pendingHoldHours}
    />
  );
}

export default function StudentBookPage({
  searchParams,
}: {
  searchParams: Promise<{ lecturerId?: string; serviceId?: string; startAt?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentBookContent searchParams={searchParams} />
    </Suspense>
  );
}

