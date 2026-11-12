"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ClipboardList, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateOnly, formatDateTime, formatTimeRange } from "@/lib/utils";

interface LecturerRequestItem {
  id: string;
  bookingCode: string;
  topic: string;
  additionalNotes: string | null;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  serviceDurationSnapshot: number;
  service: { name: string };
  student: {
    studentNumber: string;
    programStudy: string;
    user: { name: string; email: string };
  };
  scheduleChangeRequests: Array<{
    id: string;
    proposedStartAt: string;
    proposedEndAt: string;
    reason: string;
  }>;
}

export function LecturerRequestsClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [items, setItems] = useState<LecturerRequestItem[]>([]);
  const [rescheduleBookings, setRescheduleBookings] = useState<LecturerRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<LecturerRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [pendingRes, confirmedRes] = await Promise.all([
          fetch("/api/lecturer/bookings?status=PENDING&limit=50"),
          fetch("/api/lecturer/bookings?status=CONFIRMED&limit=50"),
        ]);
        const [pendingJson, confirmedJson] = await Promise.all([
          pendingRes.json(),
          confirmedRes.json(),
        ]);

        if (!pendingRes.ok || !pendingJson.ok) {
          throw new Error(pendingJson.error?.message || "Gagal memuat permintaan booking.");
        }

        if (!cancelled) {
          const pendingItems: LecturerRequestItem[] = pendingJson.data.items ?? [];
          const confirmedItems: LecturerRequestItem[] = confirmedJson.data?.items ?? [];

          setItems(pendingItems);
          setRescheduleBookings(
            [...pendingItems, ...confirmedItems].filter(
              (b) => b.scheduleChangeRequests && b.scheduleChangeRequests.length > 0
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat permintaan booking.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  function loadRequests() {
    setRefreshTick((t) => t + 1);
  }

  async function handleApprove(bookingId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menyetujui booking.");
        return;
      }
      toast.success("Booking berhasil dikonfirmasi.");
      await loadRequests();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 5) {
      toast.error("Alasan penolakan wajib minimal 5 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menolak booking.");
        return;
      }
      toast.success("Booking ditolak dan slot telah dilepas.");
      setRejectTarget(null);
      setRejectReason("");
      await loadRequests();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadRequests} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Permintaan Booking Baru ({items.length})
        </h2>

        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Tidak Ada Permintaan Pending"
            description="Seluruh permintaan booking mahasiswa telah diproses."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {item.bookingCode}
                      </span>
                      <BookingStatusBadge status={item.status} />
                    </div>
                    <h3 className="font-semibold text-slate-900">{item.topic}</h3>
                    <p className="text-sm text-slate-600">
                      <strong>{item.student.user.name}</strong> (NIM {item.student.studentNumber} •{" "}
                      {item.student.programStudy})
                    </p>
                    <p className="text-sm font-medium text-[#143359]">
                      {item.service.name} ({item.serviceDurationSnapshot} mnt) •{" "}
                      {formatDateOnly(item.startAt, timezone)},{" "}
                      {formatTimeRange(item.startAt, item.endAt, timezone)}
                    </p>
                    {item.additionalNotes ? (
                      <p className="text-xs text-slate-500">Catatan: {item.additionalNotes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/lecturer/bookings/${item.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Detail
                      </Link>
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleApprove(item.id)}
                    >
                      <Check className="h-4 w-4" />
                      Setujui
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setRejectTarget(item)}
                    >
                      <X className="h-4 w-4" />
                      Tolak
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {rescheduleBookings.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Usulan Perubahan Jadwal Menunggu Keputusan ({rescheduleBookings.length})
          </h2>
          <div className="space-y-3">
            {rescheduleBookings.map((bk) => (
              <Card key={`res-${bk.id}`} className="border-amber-200">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {bk.bookingCode} — {bk.student.user.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Jadwal saat ini: {formatDateTime(bk.startAt, timezone)} → Usulan baru:{" "}
                      <strong className="text-[#143359]">
                        {formatDateTime(bk.scheduleChangeRequests[0].proposedStartAt, timezone)}
                      </strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alasan: {bk.scheduleChangeRequests[0].reason}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/lecturer/bookings/${bk.id}`}>Tinjau & Putuskan</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tolak Booking {rejectTarget?.bookingCode}</DialogTitle>
              <DialogDescription>
                Alasan penolakan wajib diisi untuk disampaikan kepada mahasiswa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="list-reject-reason">Alasan Penolakan *</Label>
              <Textarea
                id="list-reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan (minimal 5 karakter)..."
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectTarget(null)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? "Menolak..." : "Tolak Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
