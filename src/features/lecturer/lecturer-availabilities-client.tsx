"use client";

import { useEffect, useState } from "react";
import { Clock, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import type { AvailabilityStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateOnly, formatTimeRange } from "@/lib/utils";

interface AvailabilityRow {
  id: string;
  startAt: string;
  endAt: string;
  status: AvailabilityStatus;
}

function getTimezoneOffsetString(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+07:00";
    const match = tzName.match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : "+07:00";
  } catch {
    return "+07:00";
  }
}

export function LecturerAvailabilitiesClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [items, setItems] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateStr, setDateStr] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AvailabilityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/availabilities");
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat ketersediaan.");
        }
        if (!cancelled) setItems(json.data.availabilities ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat ketersediaan.");
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

  function loadAvailabilities() {
    setRefreshTick((t) => t + 1);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!dateStr || !startTime || !endTime) {
      toast.error("Lengkapi tanggal, jam mulai, dan jam selesai.");
      return;
    }
    if (startTime >= endTime) {
      toast.error("Jam mulai harus lebih awal dari jam selesai.");
      return;
    }

    const offset = getTimezoneOffsetString(timezone);
    const startIso = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();
    const endIso = new Date(`${dateStr}T${endTime}:00${offset}`).toISOString();

    setCreating(true);
    try {
      const res = await fetch("/api/availabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: startIso, endAt: endIso, status: "OPEN" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menambah ketersediaan.");
        return;
      }
      toast.success("Jadwal ketersediaan berhasil ditambahkan.");
      await loadAvailabilities();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(av: AvailabilityRow) {
    const nextStatus = av.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await fetch(`/api/availabilities/${av.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal memperbarui status ketersediaan.");
        return;
      }
      toast.success(
        nextStatus === "OPEN" ? "Ketersediaan dibuka kembali." : "Ketersediaan berhasil ditutup."
      );
      await loadAvailabilities();
    } catch {
      toast.error("Gagal menghubungi server.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/availabilities/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menghapus ketersediaan.");
        return;
      }
      toast.success("Ketersediaan berhasil dihapus.");
      setDeleteTarget(null);
      await loadAvailabilities();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Rentang Ketersediaan Baru</CardTitle>
          <CardDescription>
            Tentukan rentang jam terbuka untuk bimbingan ({timezone}). Sistem otomatis mencegah jadwal tumpang tindih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="avail-date">Tanggal</Label>
              <Input
                id="avail-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avail-start">Jam Mulai</Label>
              <Input
                id="avail-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avail-end">Jam Selesai</Label>
              <Input
                id="avail-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              <Plus className="h-4 w-4" />
              {creating ? "Menyimpan..." : "Tambah Slot"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadAvailabilities} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="Belum Ada Ketersediaan"
          description="Tambahkan jadwal ketersediaan pertama Anda agar mahasiswa dapat mengajukan booking."
        />
      ) : (
        <div className="space-y-3">
          {items.map((av) => (
            <Card key={av.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">
                      {formatDateOnly(av.startAt, timezone)}
                    </h4>
                    <Badge
                      className={
                        av.status === "OPEN"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }
                    >
                      {av.status === "OPEN" ? "Terbuka" : "Ditutup"}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#143359] font-medium">
                    {formatTimeRange(av.startAt, av.endAt, timezone)} ({timezone})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(av)}
                  >
                    {av.status === "OPEN" ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Tutup Slot
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        Buka Slot
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(av)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Jadwal Ketersediaan?"
        description="Penghapusan hanya berhasil apabila tidak terdapat booking aktif pada rentang waktu ini."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
