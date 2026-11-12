import { Suspense } from "react";
import Link from "next/link";
import { Calendar, CalendarClock, Clock, ClipboardList } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateTime, formatTimeRange, getLocalDateKey } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function LecturerDashboardContent() {
  const user = await requirePageUser(["LECTURER"]);
  const lecturerId = user.lecturerProfile?.id;
  if (!lecturerId) {
    return (
      <EmptyState
        title="Profil Dosen Belum Lengkap"
        description="Hubungi administrator untuk melengkapi profil dosen Anda."
      />
    );
  }

  const now = new Date();
  const [policy, pendingCount, upcomingBookings, latestRequests] = await Promise.all([
    getCampusPolicy(),
    prisma.booking.count({ where: { lecturerId, status: "PENDING" } }),
    prisma.booking.findMany({
      where: {
        lecturerId,
        status: "CONFIRMED",
        endAt: { gte: now },
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        service: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { lecturerId, status: "PENDING" },
      include: {
        student: { include: { user: { select: { name: true } } } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const todayKey = getLocalDateKey(now, policy.campusTimezone);
  const todayConsultations = upcomingBookings.filter(
    (b) => getLocalDateKey(b.startAt, policy.campusTimezone) === todayKey
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Selamat datang, {user.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            NIDN {user.lecturerProfile?.lecturerNumber}
            {user.lecturerProfile?.nip ? ` • NIP ${user.lecturerProfile.nip}` : ""} •{" "}
            {user.lecturerProfile?.faculty}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/lecturer/calendar">
              <Calendar className="h-4 w-4" />
              Kalender
            </Link>
          </Button>
          <Button asChild>
            <Link href="/lecturer/availabilities">
              <Clock className="h-4 w-4" />
              Atur Ketersediaan
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Permintaan Menunggu</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClipboardList className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Konsultasi Hari Ini</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{todayConsultations.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Konsultasi Mendatang</p>
              <p className="mt-1 text-3xl font-bold text-[#143359]">{upcomingBookings.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#143359]">
              <CalendarClock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Permintaan Terbaru */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Permintaan Booking Terbaru</CardTitle>
              <CardDescription>Menunggu keputusan persetujuan atau penolakan Anda.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/lecturer/requests">Kelola Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestRequests.length === 0 ? (
              <EmptyState
                title="Tidak Ada Permintaan Baru"
                description="Semua permintaan booking mahasiswa sudah Anda putuskan."
              />
            ) : (
              <div className="space-y-3">
                {latestRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-slate-200 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{req.bookingCode}</span>
                        <BookingStatusBadge status={req.status} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{req.topic}</p>
                      <p className="text-xs text-slate-600">
                        {req.student.user.name} • {req.service.name}
                      </p>
                      <p className="text-xs font-medium text-[#143359]">
                        {formatDateTime(req.startAt, policy.campusTimezone)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href={`/lecturer/bookings/${req.id}`}>Tinjau</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agenda Mendatang */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Agenda Konsultasi Terkonfirmasi</CardTitle>
              <CardDescription>Jadwal bimbingan yang akan berlangsung.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/lecturer/upcoming">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <EmptyState
                title="Belum Ada Konsultasi Mendatang"
                description="Jadwal konsultasi terkonfirmasi akan muncul di sini."
              />
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 5).map((bk) => (
                  <div
                    key={bk.id}
                    className="rounded-lg border border-slate-200 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{bk.topic}</p>
                      <p className="text-xs text-slate-600">
                        {bk.student.user.name} • {bk.service.name}
                      </p>
                      <p className="text-xs font-medium text-emerald-700">
                        {formatDateTime(bk.startAt, policy.campusTimezone)} (
                        {formatTimeRange(bk.startAt, bk.endAt, policy.campusTimezone)})
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href={`/lecturer/bookings/${bk.id}`}>Detail</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LecturerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerDashboardContent />
    </Suspense>
  );
}

