"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ClipboardList, ExternalLink, Plus } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDateTime, formatTimeRange } from "@/lib/utils";
import type { BookingStatus } from "@prisma/client";

interface BookingRow {
  id: string;
  bookingCode: string;
  topic: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  serviceDurationSnapshot: number;
  lecturer: { user: { name: string } };
  service: { name: string };
}

export function StudentBookingsClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState<BookingRow[]>([]);
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
        if (status !== "ALL") params.set("status", status);
        if (fromDate) params.set("from", new Date(`${fromDate}T00:00:00+07:00`).toISOString());
        if (toDate) params.set("to", new Date(`${toDate}T23:59:59+07:00`).toISOString());

        const res = await fetch(`/api/bookings?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat daftar booking.");
        }
        if (!cancelled) setItems(json.data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat daftar booking.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [status, fromDate, toDate, refreshTick]);

  function loadBookings() {
    setRefreshTick((t) => t + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Kelola seluruh pengajuan konsultasi akademik dan pantau status persetujuannya.
        </p>
        <Button asChild>
          <Link href="/student/book">
            <Plus className="h-4 w-4" />
            Buat Booking Baru
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Filter Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu Persetujuan</SelectItem>
                <SelectItem value="CONFIRMED">Dikonfirmasi</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                <SelectItem value="NO_SHOW">Tidak Hadir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-from">Dari Tanggal</Label>
            <Input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to">Sampai Tanggal</Label>
            <Input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadBookings} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Belum Ada Booking"
          description="Belum ada booking sesuai filter yang dipilih."
          action={
            <Button asChild size="sm">
              <Link href="/student/book">Buat Booking Sekarang</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Dosen & Layanan</TableHead>
                <TableHead>Topik</TableHead>
                <TableHead>Waktu ({timezone})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {item.bookingCode}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">{item.lecturer.user.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.service.name} ({item.serviceDurationSnapshot} mnt)
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium text-slate-800">{item.topic}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {formatDateTime(item.startAt, timezone)} (
                        {formatTimeRange(item.startAt, item.endAt, timezone)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/student/bookings/${item.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Detail
                      </Link>
                    </Button>
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
