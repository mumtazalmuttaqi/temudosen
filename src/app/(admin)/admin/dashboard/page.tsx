import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, ClipboardList, FileText, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateTime } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";

async function AdminDashboardContent() {
  await requirePageUser(["ADMIN"]);

  const [
    policy,
    totalUsers,
    lecturerCount,
    studentCount,
    activeServices,
    totalBookings,
    pendingBookings,
    recentLogs,
  ] = await Promise.all([
    getCampusPolicy(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "LECTURER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Panel Administrator Kampus</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan tata kelola pengguna, layanan konsultasi, statistik booking, dan audit sistem.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reports">
              <BarChart3 className="h-4 w-4" />
              Laporan & Statistik
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users">
              <Users className="h-4 w-4" />
              Kelola Pengguna
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Pengguna</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{totalUsers}</p>
              <p className="text-xs text-slate-500 mt-1">
                {lecturerCount} Dosen • {studentCount} Mahasiswa
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#143359]">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Layanan Aktif</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{activeServices}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Booking</p>
              <p className="mt-1 text-3xl font-bold text-[#143359]">{totalBookings}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Menunggu Persetujuan</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{pendingBookings}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#143359]" />
              Aktivitas Audit Log Terbaru
            </CardTitle>
            <CardDescription>Jejak aktivitas sensitif dan perubahan status terbaru.</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/audit-logs">Semua Log</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-[#143359]">
                    {log.action}
                  </span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-700">{log.entityType}</span>
                  <p className="text-xs text-slate-500">
                    Aktor: {log.actor ? `${log.actor.name} (${log.actor.role})` : "Sistem"}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDateTime(log.createdAt, policy.campusTimezone)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

