"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface AdminBookingRow {
  id: string;
  bookingCode: string;
  topic: string;
  status: BookingStatus;
  startAt: string;
  serviceDurationSnapshot: number;
  service: { name: string };
  student: { studentNumber: string; user: { name: string } };
  lecturer: { user: { name: string } };
  consultation: {
    privateNotes: string | null;
    studentVisibleNotes: string | null;
    canViewPrivateNotes: boolean;
  } | null;
}

export function AdminBookingsClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status !== "ALL") params.set("status", status);

        const res = await fetch(`/api/admin/bookings?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat booking.");
        }
        if (!cancelled) setItems(json.data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat booking.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [q, status, refreshTick]);

  function loadBookings() {
    setRefreshTick((t) => t + 1);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari kode booking, topik, mahasiswa, atau dosen..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Status" />
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
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadBookings} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Tidak Ada Data Booking"
          description="Belum ada booking sesuai filter pencarian Anda."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Dosen</TableHead>
                <TableHead>Topik & Layanan</TableHead>
                <TableHead>Waktu ({timezone})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Privasi Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs font-semibold">{b.bookingCode}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">{b.student.user.name}</p>
                    <p className="text-xs text-slate-500">{b.student.studentNumber}</p>
                  </TableCell>
                  <TableCell>{b.lecturer.user.name}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium text-slate-800">{b.topic}</p>
                    <p className="text-xs text-slate-500">
                      {b.service.name} ({b.serviceDurationSnapshot} mnt)
                    </p>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateTime(b.startAt, timezone)}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {!b.consultation
                      ? "Belum ada catatan"
                      : b.consultation.canViewPrivateNotes
                        ? b.consultation.privateNotes || "Kosong"
                        : "Catatan privat dilindungi"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
