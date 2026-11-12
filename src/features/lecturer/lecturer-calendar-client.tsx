"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateOnly, formatTimeRange, getLocalDateKey } from "@/lib/utils";
import type { AvailabilityStatus, BookingStatus } from "@prisma/client";

interface CalendarAvailability {
  id: string;
  startAt: string;
  endAt: string;
  status: AvailabilityStatus;
}

interface CalendarBooking {
  id: string;
  bookingCode: string;
  topic: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  service: { name: string; durationMinutes: number };
  student: { studentNumber: string; user: { name: string } };
}

export function LecturerCalendarClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [availabilities, setAvailabilities] = useState<CalendarAvailability[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = new Date(anchorDate);
    const end = new Date(anchorDate);
    if (viewMode === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === "week") {
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { from: start, to: end };
  }, [anchorDate, viewMode]);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        });
        const res = await fetch(`/api/lecturer/calendar?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat kalender.");
        }
        if (!cancelled) {
          setAvailabilities(json.data.availabilities ?? []);
          setBookings(json.data.bookings ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat kalender.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [range, refreshTick]);

  function loadCalendar() {
    setRefreshTick((t) => t + 1);
  }

  function shiftPeriod(direction: -1 | 1) {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "day") next.setDate(next.getDate() + direction);
      else if (viewMode === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  }

  const groupedDays = useMemo(() => {
    const dayMap = new Map<
      string,
      { label: string; availabilities: CalendarAvailability[]; bookings: CalendarBooking[] }
    >();

    for (const av of availabilities) {
      const key = getLocalDateKey(av.startAt, timezone);
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          label: formatDateOnly(av.startAt, timezone),
          availabilities: [],
          bookings: [],
        });
      }
      dayMap.get(key)!.availabilities.push(av);
    }

    for (const bk of bookings) {
      const key = getLocalDateKey(bk.startAt, timezone);
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          label: formatDateOnly(bk.startAt, timezone),
          availabilities: [],
          bookings: [],
        });
      }
      dayMap.get(key)!.bookings.push(bk);
    }

    return Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [availabilities, bookings, timezone]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week" | "month")}>
          <TabsList>
            <TabsTrigger value="day">Harian</TabsTrigger>
            <TabsTrigger value="week">Mingguan</TabsTrigger>
            <TabsTrigger value="month">Bulanan</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftPeriod(-1)}>
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
            Hari Ini
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftPeriod(1)}>
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Periode:{" "}
        <strong>
          {formatDateOnly(range.from, timezone)} – {formatDateOnly(range.to, timezone)}
        </strong>{" "}
        ({timezone})
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadCalendar} />
      ) : groupedDays.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-6 w-6" />}
          title="Tidak Ada Jadwal pada Periode Ini"
          description="Belum ada rentang ketersediaan maupun booking pada periode yang dipilih."
          action={
            <Button asChild size="sm">
              <Link href="/lecturer/availabilities">Atur Ketersediaan</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedDays.map(([dateKey, dayData]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{dayData.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayData.availabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dayData.availabilities.map((av) => (
                      <span
                        key={av.id}
                        className={
                          av.status === "OPEN"
                            ? "inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                            : "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        <Clock className="h-3 w-3" />
                        Ketersediaan {av.status === "OPEN" ? "Terbuka" : "Ditutup"}:{" "}
                        {formatTimeRange(av.startAt, av.endAt, timezone)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {dayData.bookings.length > 0 ? (
                  <div className="space-y-2">
                    {dayData.bookings.map((bk) => (
                      <div
                        key={bk.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              {bk.bookingCode}
                            </span>
                            <BookingStatusBadge status={bk.status} />
                            <span className="text-xs font-semibold text-[#143359]">
                              {formatTimeRange(bk.startAt, bk.endAt, timezone)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900">{bk.topic}</p>
                          <p className="text-xs text-slate-600">
                            {bk.student.user.name} ({bk.student.studentNumber}) • {bk.service.name}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link href={`/lecturer/bookings/${bk.id}`}>Detail</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Belum ada booking pada tanggal ini.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
