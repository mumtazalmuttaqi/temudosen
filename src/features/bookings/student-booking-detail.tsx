"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, History, MessageSquareText, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus, ScheduleChangeStatus } from "@prisma/client";
import { BookingStatusBadge, ScheduleChangeStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDateOnly, formatDateTime, formatTimeRange } from "@/lib/utils";

interface BookingDetailData {
  id: string;
  bookingCode: string;
  lecturerId: string;
  serviceId: string;
  topic: string;
  additionalNotes: string | null;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  serviceDurationSnapshot: number;
  rejectionReason: string | null;
  cancellationReason: string | null;
  lecturer: {
    user: { name: string; email: string };
    faculty: string;
  };
  service: { name: string; description: string | null };
  consultation: {
    studentVisibleNotes: string | null;
    recommendations: string | null;
    followUpDate: string | null;
  } | null;
  statusHistories: Array<{
    id: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    reason: string | null;
    createdAt: string;
    changedByUser: { name: string; role: string } | null;
  }>;
  scheduleChangeRequests: Array<{
    id: string;
    proposedStartAt: string;
    proposedEndAt: string;
    reason: string;
    status: ScheduleChangeStatus;
    decisionReason: string | null;
    createdAt: string;
  }>;
  policyFlags: {
    canCancel: boolean;
    cancelBlockedReason: string | null;
    canRequestScheduleChange: boolean;
    campusTimezone: string;
  };
}

export function StudentBookingDetail({ booking }: { booking: BookingDetailData }) {
  const router = useRouter();
  const tz = booking.policyFlags.campusTimezone;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ startAt: string; endAt: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [proposedStartAt, setProposedStartAt] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  async function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cancelReason.trim().length < 5) {
      toast.error("Alasan pembatalan minimal 5 karakter.");
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal membatalkan booking.");
        return;
      }
      toast.success("Booking berhasil dibatalkan.");
      setCancelOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setCancelling(false);
    }
  }

  async function openRescheduleDialog() {
    setRescheduleOpen(true);
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/lecturers/${booking.lecturerId}/availability?serviceId=${booking.serviceId}`
      );
      const json = await res.json();
      if (res.ok && json.ok) {
        setAvailableSlots(json.data.slots ?? []);
      }
    } catch {
      toast.error("Gagal memuat slot alternatif.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proposedStartAt || rescheduleReason.trim().length < 5) {
      toast.error("Pilih slot usulan dan isi alasan minimal 5 karakter.");
      return;
    }
    setSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/schedule-change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedStartAt,
          reason: rescheduleReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal mengajukan perubahan jadwal.");
        return;
      }
      toast.success("Permintaan perubahan jadwal telah dikirim.");
      setRescheduleOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSubmittingReschedule(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/student/bookings">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Booking
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {booking.policyFlags.canRequestScheduleChange ? (
            <Button variant="outline" size="sm" onClick={openRescheduleDialog}>
              <CalendarClock className="h-4 w-4" />
              Ajukan Perubahan Jadwal
            </Button>
          ) : null}

          {booking.policyFlags.canCancel ? (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" />
              Batalkan Booking
            </Button>
          ) : null}
        </div>
      </div>

      {/* Ringkasan Utama */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold text-slate-500">{booking.bookingCode}</p>
            <CardTitle className="text-xl mt-1">{booking.topic}</CardTitle>
            <CardDescription>
              {booking.lecturer.user.name} ({booking.lecturer.faculty}) • {booking.service.name}
            </CardDescription>
          </div>
          <BookingStatusBadge status={booking.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Waktu Konsultasi ({tz})</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatDateOnly(booking.startAt, tz)},{" "}
                {formatTimeRange(booking.startAt, booking.endAt, tz)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Durasi Layanan</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {booking.serviceDurationSnapshot} menit
              </p>
            </div>
            {booking.additionalNotes ? (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Keterangan Tambahan Anda</p>
                <p className="text-slate-700 mt-0.5">{booking.additionalNotes}</p>
              </div>
            ) : null}
          </div>

          {booking.rejectionReason ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <strong>Alasan Penolakan Dosen:</strong> {booking.rejectionReason}
            </div>
          ) : null}

          {booking.cancellationReason ? (
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-3.5 text-sm text-slate-800">
              <strong>Alasan Pembatalan:</strong> {booking.cancellationReason}
            </div>
          ) : null}

          {!booking.policyFlags.canCancel &&
          booking.policyFlags.cancelBlockedReason &&
          (booking.status === "PENDING" || booking.status === "CONFIRMED") ? (
            <p className="text-xs text-slate-500">
              Info Kebijakan Pembatalan: {booking.policyFlags.cancelBlockedReason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Catatan Konsultasi yang Dibagikan Dosen */}
      {booking.consultation ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4 text-blue-700" />
              Catatan & Rekomendasi Konsultasi
            </CardTitle>
            <CardDescription>
              Ringkasan hasil bimbingan yang dibagikan oleh dosen pembimbing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Catatan Konsultasi
              </p>
              <p className="mt-1 text-slate-800 whitespace-pre-line">
                {booking.consultation.studentVisibleNotes || "Belum ada catatan dibagikan."}
              </p>
            </div>
            {booking.consultation.recommendations ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rekomendasi / Tindak Lanjut
                </p>
                <p className="mt-1 text-slate-800 whitespace-pre-line">
                  {booking.consultation.recommendations}
                </p>
              </div>
            ) : null}
            {booking.consultation.followUpDate ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Tindak Lanjut
                </p>
                <p className="mt-1 font-medium text-[#143359]">
                  {formatDateOnly(booking.consultation.followUpDate, tz)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Permintaan Perubahan Jadwal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permintaan Perubahan Jadwal</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.scheduleChangeRequests.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada pengajuan perubahan jadwal.</p>
            ) : (
              <div className="space-y-3">
                {booking.scheduleChangeRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-slate-200 p-3 text-sm space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        Usulan: {formatDateTime(req.proposedStartAt, tz)}
                      </span>
                      <ScheduleChangeStatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-600">Alasan: {req.reason}</p>
                    {req.decisionReason ? (
                      <p className="text-xs text-slate-700">Keputusan: {req.decisionReason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-slate-500" />
              Riwayat Perubahan Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {booking.statusHistories.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0 text-sm">
                  <div>
                    <BookingStatusBadge status={h.toStatus} />
                    {h.reason ? <p className="mt-1 text-xs text-slate-600">{h.reason}</p> : null}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Oleh: {h.changedByUser?.name ?? "Sistem"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(h.createdAt, tz)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Batal Booking */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Batalkan Booking {booking.bookingCode}</DialogTitle>
              <DialogDescription>
                Tindakan ini akan melepaskan slot jadwal yang dipesan dan memberi tahu dosen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Alasan Pembatalan *</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan (min. 5 karakter)..."
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
              >
                Kembali
              </Button>
              <Button type="submit" variant="destructive" disabled={cancelling}>
                {cancelling ? "Membatalkan..." : "Konfirmasi Pembatalan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Perubahan Jadwal */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Ajukan Perubahan Jadwal</DialogTitle>
              <DialogDescription>
                Pilih slot waktu baru yang tersedia. Jadwal booking hanya berubah setelah disetujui.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Pilih Slot Alternatif ({tz})</Label>
              {loadingSlots ? (
                <p className="text-sm text-slate-500">Memuat slot tersedia...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Tidak ada slot alternatif tersedia dalam 14 hari ke depan.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSlots.map((slot) => {
                    const active = proposedStartAt === slot.startAt;
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        onClick={() => setProposedStartAt(slot.startAt)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                          active
                            ? "border-[#143359] bg-[#143359] text-white"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span className="font-semibold block">
                          {formatDateOnly(slot.startAt, tz)}
                        </span>
                        <span>{formatTimeRange(slot.startAt, slot.endAt, tz)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reschedule-reason">Alasan Perubahan Jadwal *</Label>
              <Textarea
                id="reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Contoh: Bentrok dengan jadwal praktikum wajib."
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleOpen(false)}
                disabled={submittingReschedule}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submittingReschedule || !proposedStartAt || rescheduleReason.trim().length < 5}
              >
                {submittingReschedule ? "Mengirim..." : "Kirim Usulan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

