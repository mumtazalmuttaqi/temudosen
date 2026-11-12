"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateOnly, formatTimeRange, getLocalDateKey } from "@/lib/utils";

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  description: string | null;
}

interface SlotItem {
  startAt: string;
  endAt: string;
}

export function LecturerDetailSlots({
  lecturerId,
  services,
  timezone = "Asia/Jakarta",
}: {
  lecturerId: string;
  services: ServiceOption[];
  timezone?: string;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedServiceId) return;
    let cancelled = false;

    async function loadSlots() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/lecturers/${lecturerId}/availability?serviceId=${encodeURIComponent(selectedServiceId)}`
        );
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat slot tersedia.");
        }
        if (!cancelled) {
          setSlots(json.data.slots ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat slot tersedia.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [lecturerId, selectedServiceId]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, SlotItem[]>();
    for (const slot of slots) {
      const key = getLocalDateKey(slot.startAt, timezone);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(slot);
    }
    return Array.from(groups.entries());
  }, [slots, timezone]);

  if (services.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Layanan Aktif"
        description="Dosen ini belum memiliki layanan konsultasi yang aktif saat ini."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kalender Slot Tersedia</CardTitle>
        <CardDescription>
          Pilih layanan terlebih dahulu untuk melihat slot waktu yang benar-benar tersedia ({timezone}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="max-w-sm space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Layanan Konsultasi</label>
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih layanan" />
            </SelectTrigger>
            <SelectContent>
              {services.map((svc) => (
                <SelectItem key={svc.id} value={svc.id}>
                  {svc.name} ({svc.durationMinutes} menit)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : groupedByDate.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="Tidak Ada Slot Tersedia"
            description="Seluruh jadwal pada rentang 14 hari ke depan penuh atau belum dibuka oleh dosen."
          />
        ) : (
          <div className="space-y-4">
            {groupedByDate.map(([dateKey, daySlots]) => (
              <div key={dateKey} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {formatDateOnly(daySlots[0].startAt, timezone)}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <Button
                      key={slot.startAt}
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-blue-200 bg-blue-50/40 hover:bg-[#143359] hover:text-white"
                    >
                      <Link
                        href={`/student/book?lecturerId=${lecturerId}&serviceId=${selectedServiceId}&startAt=${encodeURIComponent(slot.startAt)}`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {formatTimeRange(slot.startAt, slot.endAt, timezone)}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

