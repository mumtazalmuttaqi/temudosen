"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BookingStatus } from "@prisma/client";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface ReportPayload {
  summary: {
    totalBookings: number;
    pending: number;
    confirmed: number;
    completed: number;
    rejectedOrCancelled: number;
    noShow: number;
  };
  byStatus: Array<{ status: BookingStatus; label: string; count: number }>;
  byService: Array<{ name: string; count: number }>;
  byLecturer: Array<{ name: string; count: number }>;
  trend: Array<{ date: string; total: number; confirmed: number; completed: number }>;
  campusTimezone: string;
  rows: Array<{
    id: string;
    bookingCode: string;
    studentName: string;
    studentNumber: string;
    lecturerName: string;
    serviceName: string;
    durationMinutes: number;
    startAt: string;
    status: BookingStatus;
    topic: string;
  }>;
}

const PIE_COLORS = ["#f59e0b", "#10b981", "#2563eb", "#f43f5e", "#64748b", "#71717a"];

export function ReportsClient({
  lecturers,
  services,
}: {
  lecturers: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("ALL");
  const [lecturerId, setLecturerId] = useState("ALL");
  const [serviceId, setServiceId] = useState("ALL");

  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", new Date(`${fromDate}T00:00:00+07:00`).toISOString());
    if (toDate) params.set("to", new Date(`${toDate}T23:59:59+07:00`).toISOString());
    if (status !== "ALL") params.set("status", status);
    if (lecturerId !== "ALL") params.set("lecturerId", lecturerId);
    if (serviceId !== "ALL") params.set("serviceId", serviceId);
    return params.toString();
  }, [fromDate, toDate, status, lecturerId, serviceId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery();
        const res = await fetch(`/api/admin/reports?${qs}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat laporan.");
        }
        if (!cancelled) setData(json.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat laporan.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [buildQuery, refreshTick]);

  function loadReport() {
    setRefreshTick((t) => t + 1);
  }

  const exportUrl = `/api/admin/reports/export?${buildQuery()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Statistik konsultasi akademik berdasarkan periode, dosen, layanan, dan status.
        </p>
        <Button asChild variant="outline">
          <a href={exportUrl} download="laporan-booking-temudosen.csv">
            <Download className="h-4 w-4" />
            Ekspor CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="rep-from">Dari Tanggal</Label>
            <Input
              id="rep-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rep-to">Sampai Tanggal</Label>
            <Input
              id="rep-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">NoShow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dosen</Label>
            <Select value={lecturerId} onValueChange={setLecturerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Dosen</SelectItem>
                {lecturers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Layanan</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Layanan</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState message={error ?? "Data laporan tidak tersedia."} onRetry={loadReport} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500">Total Booking</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {data.summary.totalBookings}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500">Menunggu</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500">Dikonfirmasi</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {data.summary.confirmed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500">Selesai</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{data.summary.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500">Ditolak / Batal</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  {data.summary.rejectedOrCancelled}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tren Booking per Tanggal</CardTitle>
                <CardDescription>Volume booking berdasarkan jadwal konsultasi.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {data.trend.length === 0 ? (
                  <EmptyState title="Belum Ada Data Tren" description="Ubah filter periode." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#143359"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="Selesai"
                        stroke="#2563eb"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Booking</CardTitle>
                <CardDescription>Proporsi status dari keseluruhan filter.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {data.summary.totalBookings === 0 ? (
                  <EmptyState title="Data Kosong" description="Tidak ada booking pada filter ini." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byStatus.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label
                      >
                        {data.byStatus
                          .filter((s) => s.count > 0)
                          .map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking per Layanan</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byService}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah Booking" fill="#143359" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking per Dosen</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byLecturer}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah Booking" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rincian Data Booking ({data.rows.length})</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Dosen</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.bookingCode}</TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{r.studentName}</p>
                      <p className="text-xs text-slate-500">{r.studentNumber}</p>
                    </TableCell>
                    <TableCell>{r.lecturerName}</TableCell>
                    <TableCell>
                      {r.serviceName} ({r.durationMinutes}m)
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTime(r.startAt, data.campusTimezone)}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
