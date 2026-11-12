import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentBookingDetail } from "@/features/bookings/student-booking-detail";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getBookingDetailForActor } from "@/server/services/booking-service";
import { NotFoundError } from "@/server/services/errors";

async function StudentBookingDetailContent({ id }: { id: string }) {
  const user = await requirePageUser(["STUDENT"]);
  let detail;
  try {
    detail = await getBookingDetailForActor(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return <StudentBookingDetail booking={JSON.parse(JSON.stringify(detail))} />;
}

export default async function StudentBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentBookingDetailContent id={id} />
    </Suspense>
  );
}

