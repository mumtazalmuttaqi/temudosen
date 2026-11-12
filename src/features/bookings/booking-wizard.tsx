"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  cn,
  formatDateOnly,
  formatDateTime,
  formatTimeRange,
  getInitials,
  getLocalDateKey,
} from "@/lib/utils";

export interface WizardLecturer {
  id: string;
  name: string;
  faculty: string;
  expertise: string;
  thesisRecommendations: string[];
  serviceIds: string[];
}

export interface WizardService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
}

interface AvailableSlot {
  startAt: string;
  endAt: string;
}

interface CreatedBookingResult {
  id: string;
  bookingCode: string;
  status: "PENDING";
  startAt: string;
  endAt: string;
  serviceDurationSnapshot: number;
  topic: string;
  lecturer: { user: { name: string } };
  service: { name: string };
}

export function BookingWizard({
  lecturers,
  services,
  initialLecturerId,
  initialServiceId,
  initialStartAt,
  initialTopic,
  timezone = "Asia/Jakarta",
  pendingHoldHours = 24,
}: {
  lecturers: WizardLecturer[];
  services: WizardService[];
  initialLecturerId?: string;
  initialServiceId?: string;
  initialStartAt?: string;
  initialTopic?: string;
  timezone?: string;
  pendingHoldHours?: number;
}) {
  const [step, setStep] = useState<number>(() => {
    if (initialLecturerId && initialServiceId && initialStartAt) return 4;
    if (initialLecturerId && initialServiceId) return 3;
    if (initialLecturerId) return 2;
    return 1;
  });

  const [lecturerSearch, setLecturerSearch] = useState("");
  const [lecturerId, setLecturerId] = useState(initialLecturerId ?? "");
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [startAt, setStartAt] = useState(initialStartAt ?? "");
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<CreatedBookingResult | null>(null);

  const selectedLecturer = useMemo(
    () => lecturers.find((l) => l.id === lecturerId) ?? null,
    [lecturers, lecturerId]
  );

  const offeredServices = useMemo(() => {
    if (!selectedLecturer) return services;
    if (selectedLecturer.serviceIds.length === 0) return services;
    return services.filter((s) => selectedLecturer.serviceIds.includes(s.id));
  }, [selectedLecturer, services]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const selectedSlot = useMemo(
    () => slots.find((s) => s.startAt === startAt) ?? null,
    [slots, startAt]
  );

  const [slotsRefreshTick, setSlotsRefreshTick] = useState(0);

  useEffect(() => {
    if (!lecturerId || !serviceId) return;
    let cancelled = false;
    async function run() {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const res = await fetch(
          `/api/lecturers/${lecturerId}/availability?serviceId=${encodeURIComponent(serviceId)}`
        );
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat slot tersedia.");
        }
        if (cancelled) return;
        const nextSlots: AvailableSlot[] = json.data.slots ?? [];
        setSlots(nextSlots);

        if (initialStartAt && nextSlots.some((s) => s.startAt === initialStartAt)) {
          setSelectedDateKey(getLocalDateKey(initialStartAt, timezone));
        } else if (nextSlots.length > 0) {
          setSelectedDateKey((prev) =>
            prev && nextSlots.some((s) => getLocalDateKey(s.startAt, timezone) === prev)
              ? prev
              : getLocalDateKey(nextSlots[0].startAt, timezone)
          );
        } else {
          setSelectedDateKey("");
        }
      } catch (err) {
        if (!cancelled) {
          setSlotsError(err instanceof Error ? err.message : "Gagal memuat slot tersedia.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [lecturerId, serviceId, initialStartAt, timezone, slotsRefreshTick]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const s of slots) {
      const key = getLocalDateKey(s.startAt, timezone);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots, timezone]);

  const slotsForSelectedDate = useMemo(() => {
    const found = dateGroups.find(([key]) => key === selectedDateKey);
    return found ? found[1] : [];
  }, [dateGroups, selectedDateKey]);

  async function handleSubmitBooking() {
    if (!lecturerId || !serviceId || !startAt || topic.trim().length < 5) {
      toast.error("Lengkapi seluruh data booking terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturerId,
          serviceId,
          startAt,
          topic: topic.trim(),
          additionalNotes: additionalNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal mengajukan booking.");
        if (res.status === 409) {
          // Slot baru saja diambil: muat ulang slot dan kembali ke langkah pemilihan waktu
          setStartAt("");
          setStep(3);
          setSlotsRefreshTick((t) => t + 1);
        }
        return;
      }

      setCreatedBooking(json.data.booking);
      setStep(6);
      toast.success("Permintaan booking berhasil dikirim!");
    } catch {
      toast.error("Gagal menghubungi server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdBooking) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-200">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Permintaan Terkirim
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Nomor Booking: <span className="font-mono">{createdBooking.bookingCode}</span>
            </h2>
            <div className="mt-2 flex justify-center">
              <BookingStatusBadge status={createdBooking.status} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Dosen</span>
              <span className="font-medium text-slate-900">{createdBooking.lecturer.user.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Layanan</span>
              <span className="font-medium text-slate-900">
                {createdBooking.service.name} ({createdBooking.serviceDurationSnapshot} menit)
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Jadwal</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(createdBooking.startAt, timezone)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Topik</span>
              <span className="font-medium text-slate-900 text-right">{createdBooking.topic}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Slot ditahan sementara hingga {pendingHoldHours} jam sambil menunggu persetujuan dosen (kebijakan kampus yang dapat dikonfigurasi).
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link href={`/student/bookings/${createdBooking.id}`}>Lihat Detail Booking</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/student/bookings">Daftar Booking Saya</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = [
    { num: 1, title: "Pilih Dosen" },
    { num: 2, title: "Pilih Layanan" },
    { num: 3, title: "Tanggal & Slot" },
    { num: 4, title: "Isi Topik" },
    { num: 5, title: "Tinjau & Kirim" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stepper */}
      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((s) => {
          const isCurrent = step === s.num;
          const isDone = step > s.num;
          return (
            <li
              key={s.num}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-2",
                isCurrent
                  ? "border-[#143359] bg-[#143359] text-white"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-[11px] font-bold">
                {s.num}
              </span>
              <span className="truncate">{s.title}</span>
            </li>
          );
        })}
      </ol>

      {/* Step 1: Pilih Dosen */}
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 1: Pilih Dosen Pembimbing / Konsultasi</CardTitle>
            <CardDescription>Pilih dosen yang ingin Anda temui.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Cari nama dosen atau bidang keahlian..."
              value={lecturerSearch}
              onChange={(e) => setLecturerSearch(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {lecturers
                .filter((lec) => {
                  const needle = lecturerSearch.trim().toLowerCase();
                  if (!needle) return true;
                  return (
                    lec.name.toLowerCase().includes(needle) ||
                    lec.expertise.toLowerCase().includes(needle) ||
                    lec.faculty.toLowerCase().includes(needle)
                  );
                })
                .map((lec) => {
                  const selected = lecturerId === lec.id;
                  return (
                    <button
                      key={lec.id}
                      type="button"
                      onClick={() => {
                        setLecturerId(lec.id);
                        setServiceId("");
                        setStartAt("");
                        setStep(2);
                      }}
                      className={cn(
                        "text-left rounded-xl border p-4 transition-all cursor-pointer",
                        selected
                          ? "border-[#143359] bg-blue-50/40 ring-2 ring-[#143359]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#143359] text-xs font-bold text-white">
                          {getInitials(lec.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{lec.name}</p>
                          <p className="text-xs text-slate-500">{lec.faculty}</p>
                          <p className="text-xs text-blue-700 mt-1 line-clamp-2">{lec.expertise}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2: Pilih Layanan */}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 2: Pilih Layanan Konsultasi</CardTitle>
            <CardDescription>
              Dosen terpilih: <strong>{selectedLecturer?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {offeredServices.map((svc) => {
                const selected = serviceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setServiceId(svc.id);
                      setStartAt("");
                      setStep(3);
                    }}
                    className={cn(
                      "text-left rounded-xl border p-4 transition-all cursor-pointer",
                      selected
                        ? "border-[#143359] bg-blue-50/40 ring-2 ring-[#143359]/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{svc.name}</p>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#143359]">
                        {svc.durationMinutes} mnt
                      </span>
                    </div>
                    {svc.description ? (
                      <p className="mt-1.5 text-xs text-slate-600">{svc.description}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" />
              Ganti Dosen
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3: Pilih Tanggal & Slot Tersedia */}
      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 3: Pilih Tanggal dan Slot Tersedia</CardTitle>
            <CardDescription>
              {selectedLecturer?.name} • {selectedService?.name} ({selectedService?.durationMinutes}{" "}
              menit, zona waktu {timezone})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingSlots ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : slotsError ? (
              <p className="text-sm text-rose-600">{slotsError}</p>
            ) : dateGroups.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-6 w-6" />}
                title="Slot Tidak Tersedia"
                description="Dosen belum memiliki slot terbuka yang cukup untuk durasi layanan ini dalam 14 hari ke depan."
              />
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Pilih Tanggal</Label>
                  <div className="flex flex-wrap gap-2">
                    {dateGroups.map(([dateKey, groupSlots]) => (
                      <Button
                        key={dateKey}
                        type="button"
                        variant={selectedDateKey === dateKey ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedDateKey(dateKey);
                          setStartAt("");
                        }}
                      >
                        {formatDateOnly(groupSlots[0].startAt, timezone)} ({groupSlots.length})
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pilih Jam Konsultasi</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {slotsForSelectedDate.map((slot) => {
                      const active = startAt === slot.startAt;
                      return (
                        <button
                          key={slot.startAt}
                          type="button"
                          onClick={() => setStartAt(slot.startAt)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                            active
                              ? "border-[#143359] bg-[#143359] text-white"
                              : "border-slate-200 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/40"
                          )}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {formatTimeRange(slot.startAt, slot.endAt, timezone)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button
                type="button"
                disabled={!startAt}
                onClick={() => setStep(4)}
              >
                Lanjut Isi Topik
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 4: Topik & Keterangan */}
      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 4: Isi Topik dan Keterangan Tambahan</CardTitle>
            <CardDescription>
              Jelaskan agenda konsultasi agar dosen dapat mempersiapkan materi bimbingan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLecturer && selectedLecturer.thesisRecommendations.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-xs font-semibold text-[#143359]">
                  Pilih cepat rekomendasi topik skripsi dari {selectedLecturer.name}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLecturer.thesisRecommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(rec.slice(0, 200))}
                      className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-left text-xs text-slate-700 hover:bg-blue-50 cursor-pointer"
                    >
                      {rec.length > 90 ? `${rec.slice(0, 90)}...` : rec}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="booking-topic">Topik / Tujuan Konsultasi *</Label>
              <Input
                id="booking-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: Konsultasi Revisi Bab 3 Metodologi Penelitian"
                maxLength={200}
                required
              />
              <p className="text-xs text-slate-500">Minimal 5 karakter.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking-notes">Keterangan Tambahan (Opsional)</Label>
              <Textarea
                id="booking-notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Cantumkan poin pertanyaan spesifik atau tautan dokumen..."
                maxLength={1500}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4" />
                Ubah Waktu
              </Button>
              <Button
                type="button"
                disabled={topic.trim().length < 5}
                onClick={() => setStep(5)}
              >
                Tinjau Ringkasan
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 5: Tinjau Ringkasan & Kirim */}
      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 5: Tinjau Ringkasan Permintaan</CardTitle>
            <CardDescription>
              Pastikan seluruh detail booking sudah benar sebelum dikirim ke dosen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Dosen</span>
                <span className="font-semibold text-slate-900">{selectedLecturer?.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Layanan</span>
                <span className="font-semibold text-slate-900">
                  {selectedService?.name} ({selectedService?.durationMinutes} menit)
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Waktu ({timezone})</span>
                <span className="font-semibold text-[#143359]">
                  {selectedSlot
                    ? `${formatDateOnly(selectedSlot.startAt, timezone)}, ${formatTimeRange(selectedSlot.startAt, selectedSlot.endAt, timezone)}`
                    : formatDateTime(startAt, timezone)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Topik</span>
                <span className="font-semibold text-slate-900 text-right">{topic}</span>
              </div>
              {additionalNotes ? (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-xs">Keterangan Tambahan</span>
                  <p className="mt-1 text-slate-700">{additionalNotes}</p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} disabled={submitting}>
                <ChevronLeft className="h-4 w-4" />
                Ubah Topik
              </Button>
              <Button onClick={handleSubmitBooking} disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "Mengirim Permintaan..." : "Kirim Permintaan Booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
