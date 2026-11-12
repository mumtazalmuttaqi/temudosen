import { Suspense } from "react";
import Link from "next/link";
import { Bell, CalendarCheck, CheckCircle2, Clock, Plus } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateTime, formatTimeRange } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function StudentDashboardContent() {
  const user = await requirePageUser(["STUDENT"]);
  const studentId = user.studentProfile?.id;
  if (!studentId) {
    return (
      <EmptyState
        title="Profil Mahasiswa Belum Lengkap"
        description="Hubungi administrator untuk melengkapi profil NIM Anda."
      />
    );
  }

  const now = new Date();
  const [policy, pendingCount, confirmedCount, completedCount, nearestBooking, recentNotifications] =
    await Promise.all([
      getCampusPolicy(),
      prisma.booking.count({ where: { studentId, status: "PENDING" } }),
      prisma.booking.count({ where: { studentId, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { studentId, status: "COMPLETED" } }),
      prisma.booking.findFirst({
        where: {
          studentId,
          status: { in: ["CONFIRMED", "PENDING"] },
          endAt: { gte: now },
        },
        include: {
          lecturer: { include: { user: { select: { name: true } } } },
          service: { select: { name: true, durationMinutes: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Selamat datang, {user.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            NIM {user.studentProfile?.studentNumber} • {user.studentProfile?.programStudy} (
            {user.studentProfile?.faculty})
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/student/book">
            <Plus className="h-4 w-4" />
            Buat Booking
          </Link>
        </Button>
      </div>

      {/* Ringkasan Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Menunggu Persetujuan</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Booking Dikonfirmasi</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{confirmedCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Bimbingan Selesai</p>
              <p className="mt-1 text-3xl font-bold text-blue-700">{completedCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Terdekat */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Terdekat</CardTitle>
            <CardDescription>Jadwal konsultasi aktif terdekat Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            {nearestBooking ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {nearestBooking.bookingCode}
                  </span>
                  <BookingStatusBadge status={nearestBooking.status} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{nearestBooking.topic}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {nearestBooking.lecturer.user.name} • {nearestBooking.service.name}
                  </p>
                </div>
                <div className="text-sm font-medium text-[#143359]">
                  {formatDateTime(nearestBooking.startAt, policy.campusTimezone)} (
                  {formatTimeRange(
                    nearestBooking.startAt,
                    nearestBooking.endAt,
                    policy.campusTimezone
                  )}
                  )
                </div>
                <div className="pt-1 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/student/bookings/${nearestBooking.id}`}>Lihat Detail</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Belum Ada Jadwal Mendatang"
                description="Anda belum memiliki booking aktif. Pilih dosen dan ajukan jadwal konsultasi sekarang."
                action={
                  <Button asChild size="sm">
                    <Link href="/student/lecturers">Cari Dosen</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Aktivitas / Notifikasi Terbaru */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Aktivitas & Notifikasi Terbaru</CardTitle>
              <CardDescription>Pembaruan status dan catatan bimbingan Anda.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/student/notifications">Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="h-5 w-5" />}
                title="Belum Ada Aktivitas"
                description="Notifikasi status booking Anda akan tampil di sini."
              />
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="rounded-lg border border-slate-200 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-600">{notif.message}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(notif.createdAt, policy.campusTimezone)}
                      </p>
                    </div>
                    {!notif.readAt ? (
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    ) : null}
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

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}

