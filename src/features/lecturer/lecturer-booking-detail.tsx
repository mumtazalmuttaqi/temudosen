"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  History,
  Lock,
  Save,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { BookingStatus, ScheduleChangeStatus } from "@prisma/client";
import { BookingStatusBadge, ScheduleChangeStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateOnly, formatDateTime, formatTimeRange } from "@/lib/utils";

interface LecturerBookingDetailData {
  id: string;
  bookingCode: string;
  topic: string;
  additionalNotes: string | null;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  serviceDurationSnapshot: number;
  rejectionReason: string | null;
  cancellationReason: string | null;
  student: {
    studentNumber: string;
    programStudy: string;
    faculty: string;
    user: { name: string; email: string };
  };
  service: { name: string };
  consultation: {
    privateNotes: string | null;
    studentVisibleNotes: string | null;
    recommendations: string | null;
    followUpDate: string | null;
  } | null;
  statusHistories: Array<{
    id: string;
    toStatus: BookingStatus;
    reason: string | null;
    createdAt: string;
    changedByUser: { name: string } | null;
  }>;
  scheduleChangeRequests: Array<{
    id: string;
    proposedStartAt: string;
    proposedEndAt: string;
    reason: string;
    status: ScheduleChangeStatus;
    decisionReason: string | null;
  }>;
  policyFlags: {
    canDecide: boolean;
    canCompleteOrNoShow: boolean;
    canEditConsultation: boolean;
    campusTimezone: string;
  };
}

export function LecturerBookingDetail({ booking }: { booking: LecturerBookingDetailData }) {
  const router = useRouter();
  const tz = booking.policyFlags.campusTimezone;

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmNoShowOpen, setConfirmNoShowOpen] = useState(false);

  const [privateNotes, setPrivateNotes] = useState(booking.consultation?.privateNotes ?? "");
  const [studentVisibleNotes, setStudentVisibleNotes] = useState(
    booking.consultation?.studentVisibleNotes ?? ""
  );
  const [recommendations, setRecommendations] = useState(
    booking.consultation?.recommendations ?? ""
  );
  const [followUpDate, setFollowUpDate] = useState(
    booking.consultation?.followUpDate
      ? booking.consultation.followUpDate.slice(0, 10)
      : ""
  );
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/approve`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menyetujui booking.");
        return;
      }
      toast.success("Booking disetujui.");
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rejectReason.trim().length < 5) {
      toast.error("Alasan penolakan minimal 5 karakter.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reject`, {
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
      setRejectOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinalize(endpoint: "complete" | "no-show") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/${endpoint}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal memperbarui status.");
        return;
      }
      toast.success(
        endpoint === "complete"
          ? "Konsultasi ditandai selesai."
          : "Status ditandai tidak hadir."
      );
      setConfirmCompleteOpen(false);
      setConfirmNoShowOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleScheduleChangeDecision(reqId: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Masukkan alasan penolakan perubahan jadwal (min. 5 karakter):");
      if (!input || input.trim().length < 5) {
        toast.error("Alasan penolakan minimal 5 karakter.");
        return;
      }
      reason = input.trim();
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/schedule-change-requests/${reqId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { decisionReason: reason } : {}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal memproses perubahan jadwal.");
        return;
      }
      toast.success(
        action === "approve"
          ? "Perubahan jadwal disetujui."
          : "Perubahan jadwal ditolak."
      );
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/consultation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateNotes: privateNotes.trim() || null,
          studentVisibleNotes: studentVisibleNotes.trim() || null,
          recommendations: recommendations.trim() || null,
          followUpDate: followUpDate ? new Date(`${followUpDate}T09:00:00+07:00`).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menyimpan catatan konsultasi.");
        return;
      }
      toast.success("Catatan konsultasi berhasil disimpan.");
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/lecturer/requests">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {booking.policyFlags.canDecide ? (
            <>
              <Button variant="success" size="sm" onClick={handleApprove} disabled={actionLoading}>
                <Check className="h-4 w-4" />
                Setujui Booking
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
              >
                <X className="h-4 w-4" />
                Tolak
              </Button>
            </>
          ) : null}

          {booking.policyFlags.canCompleteOrNoShow ? (
            <>
              <Button
                size="sm"
                onClick={() => setConfirmCompleteOpen(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4" />
                Tandai Selesai
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmNoShowOpen(true)}
                disabled={actionLoading}
              >
                <UserX className="h-4 w-4" />
                Tidak Hadir
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Identitas Mahasiswa & Detail Booking */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold text-slate-500">{booking.bookingCode}</p>
            <CardTitle className="text-xl mt-1">{booking.topic}</CardTitle>
            <CardDescription>
              Mahasiswa: <strong>{booking.student.user.name}</strong> (NIM{" "}
              {booking.student.studentNumber}) • {booking.student.programStudy},{" "}
              {booking.student.faculty}
            </CardDescription>
          </div>
          <BookingStatusBadge status={booking.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Jadwal ({tz})</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatDateOnly(booking.startAt, tz)},{" "}
                {formatTimeRange(booking.startAt, booking.endAt, tz)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Layanan</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {booking.service.name} ({booking.serviceDurationSnapshot} menit)
              </p>
            </div>
            {booking.additionalNotes ? (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Keterangan Mahasiswa</p>
                <p className="text-slate-700 mt-0.5">{booking.additionalNotes}</p>
              </div>
            ) : null}
          </div>

          {booking.rejectionReason ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <strong>Alasan Penolakan:</strong> {booking.rejectionReason}
            </div>
          ) : null}
          {booking.cancellationReason ? (
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-800">
              <strong>Alasan Pembatalan:</strong> {booking.cancellationReason}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Permintaan Perubahan Jadwal jika ada */}
      {booking.scheduleChangeRequests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permintaan Perubahan Jadwal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.scheduleChangeRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      Usulan: {formatDateTime(req.proposedStartAt, tz)}
                    </span>
                    <ScheduleChangeStatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-slate-600">Alasan: {req.reason}</p>
                </div>
                {req.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleScheduleChangeDecision(req.id, "approve")}
                      disabled={actionLoading}
                    >
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleScheduleChangeDecision(req.id, "reject")}
                      disabled={actionLoading}
                    >
                      Tolak
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Form Catatan Konsultasi (Privasi Terpisah!) */}
      {booking.policyFlags.canEditConsultation ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catatan Konsultasi & Tindak Lanjut</CardTitle>
            <CardDescription>
              Pisahkan catatan pribadi dosen dan catatan yang dibagikan ke mahasiswa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="private-notes" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                  Catatan Privat Dosen (Tidak Terlihat oleh Mahasiswa)
                </Label>
                <Textarea
                  id="private-notes"
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Catatan internal evaluasi dosen..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visible-notes">Catatan untuk Mahasiswa (Dibagikan)</Label>
                <Textarea
                  id="visible-notes"
                  value={studentVisibleNotes}
                  onChange={(e) => setStudentVisibleNotes(e.target.value)}
                  placeholder="Ringkasan hasil bimbingan yang dapat dibaca mahasiswa..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recommendations">Rekomendasi / Tindak Lanjut</Label>
                <Textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Langkah perbaikan atau tugas untuk sesi selanjutnya..."
                />
              </div>

              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="followup-date">Tanggal Tindak Lanjut (Opsional)</Label>
                <Input
                  id="followup-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={savingNotes}>
                <Save className="h-4 w-4" />
                {savingNotes ? "Menyimpan..." : "Simpan Catatan Konsultasi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Riwayat Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-slate-500" />
            Riwayat Status Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2.5 text-sm">
            {booking.statusHistories.map((h) => (
              <li
                key={h.id}
                className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0"
              >
                <div>
                  <BookingStatusBadge status={h.toStatus} />
                  {h.reason ? <p className="mt-1 text-xs text-slate-600">{h.reason}</p> : null}
                  <p className="text-[11px] text-slate-400">
                    Oleh: {h.changedByUser?.name ?? "Sistem"}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{formatDateTime(h.createdAt, tz)}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Dialog Tolak Booking */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tolak Permintaan Booking</DialogTitle>
              <DialogDescription>
                Penolakan wajib menyertakan alasan agar mahasiswa mengetahui tindak lanjut yang diperlukan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Alasan Penolakan *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Jadwal berbenturan dengan rapat jurusan..."
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(false)}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={actionLoading}>
                {actionLoading ? "Menolak..." : "Tolak Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        title="Tandai Konsultasi Selesai?"
        description="Status akan berubah menjadi Selesai dan mahasiswa menerima pemberitahuan."
        confirmLabel="Ya, Tandai Selesai"
        loading={actionLoading}
        onConfirm={() => handleFinalize("complete")}
      />

      <ConfirmDialog
        open={confirmNoShowOpen}
        onOpenChange={setConfirmNoShowOpen}
        title="Tandai Mahasiswa Tidak Hadir?"
        description="Status akan dicatat sebagai Tidak Hadir (NoShow)."
        confirmLabel="Ya, Tidak Hadir"
        variant="destructive"
        loading={actionLoading}
        onConfirm={() => handleFinalize("no-show")}
      />
    </div>
  );
}

