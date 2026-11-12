import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateOnly, formatTimeRange } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerUpcomingContent() {
  const user = await requirePageUser(["LECTURER"]);
  const lecturerId = user.lecturerProfile?.id;
  if (!lecturerId) return null;

  const [policy, items] = await Promise.all([
    getCampusPolicy(),
    prisma.booking.findMany({
      where: {
        lecturerId,
        status: "CONFIRMED",
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-6 w-6" />}
        title="Belum Ada Konsultasi Mendatang"
        description="Booking yang Anda setujui akan muncul di daftar ini untuk ditindaklanjuti."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{item.bookingCode}</span>
                <BookingStatusBadge status={item.status} />
              </div>
              <h3 className="font-semibold text-slate-900">{item.topic}</h3>
              <p className="text-sm text-slate-600">
                {item.student.user.name} (NIM {item.student.studentNumber} •{" "}
                {item.student.programStudy})
              </p>
              <p className="text-sm font-medium text-[#143359]">
                {item.service.name} • {formatDateOnly(item.startAt, policy.campusTimezone)},{" "}
                {formatTimeRange(item.startAt, item.endAt, policy.campusTimezone)}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={`/lecturer/bookings/${item.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Kelola Sesi & Catatan
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LecturerUpcomingPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerUpcomingContent />
    </Suspense>
  );
}

