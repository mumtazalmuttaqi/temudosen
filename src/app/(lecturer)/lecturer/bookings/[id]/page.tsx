import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LecturerBookingDetail } from "@/features/lecturer/lecturer-booking-detail";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getBookingDetailForActor } from "@/server/services/booking-service";
import { NotFoundError } from "@/server/services/errors";

async function LecturerBookingDetailContent({ id }: { id: string }) {
  const user = await requirePageUser(["LECTURER"]);
  let detail;
  try {
    detail = await getBookingDetailForActor(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return <LecturerBookingDetail booking={JSON.parse(JSON.stringify(detail))} />;
}

export default async function LecturerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerBookingDetailContent id={id} />
    </Suspense>
  );
}

