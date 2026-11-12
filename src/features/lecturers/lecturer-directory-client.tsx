"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, GraduationCap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateTime, getInitials } from "@/lib/utils";

interface LecturerItem {
  id: string;
  lecturerNumber: string;
  expertise: string;
  faculty: string;
  bio: string | null;
  avatarUrl: string | null;
  user: { id: string; name: string; email: string };
  lecturerServices: Array<{
    service: { id: string; name: string; durationMinutes: number; description: string | null };
  }>;
  availabilities: Array<{ id: string; startAt: string; endAt: string }>;
}

interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
}

export function LecturerDirectoryClient({
  services,
  faculties,
  timezone = "Asia/Jakarta",
}: {
  services: ServiceItem[];
  faculties: string[];
  timezone?: string;
}) {
  const [q, setQ] = useState("");
  const [faculty, setFaculty] = useState("ALL");
  const [serviceId, setServiceId] = useState("ALL");
  const [items, setItems] = useState<LecturerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (faculty !== "ALL") params.set("faculty", faculty);
        if (serviceId !== "ALL") params.set("serviceId", serviceId);

        const res = await fetch(`/api/lecturers?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat daftar dosen.");
        }
        setItems(json.data.items);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Gagal memuat daftar dosen.");
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, faculty, serviceId]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama dosen atau bidang keahlian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              aria-label="Cari dosen"
            />
          </div>

          <Select value={faculty} onValueChange={setFaculty}>
            <SelectTrigger aria-label="Filter fakultas">
              <SelectValue placeholder="Semua Fakultas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Fakultas</SelectItem>
              {faculties.map((fac) => (
                <SelectItem key={fac} value={fac}>
                  {fac}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger aria-label="Filter layanan konsultasi">
              <SelectValue placeholder="Semua Layanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Layanan</SelectItem>
              {services.map((svc) => (
                <SelectItem key={svc.id} value={svc.id}>
                  {svc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setQ((prev) => prev)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="Dosen Tidak Ditemukan"
          description="Tidak ada dosen yang cocok dengan kriteria pencarian Anda. Ubah kata kunci atau filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((lec) => (
            <Card key={lec.id} className="flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#143359] text-sm font-bold text-white">
                    {getInitials(lec.user.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 leading-snug">{lec.user.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{lec.faculty}</p>
                    <p className="text-xs font-medium text-blue-700 mt-1">{lec.expertise}</p>
                  </div>
                </div>

                {lec.bio ? (
                  <p className="text-sm text-slate-600 line-clamp-3">{lec.bio}</p>
                ) : null}

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Layanan Tersedia
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lec.lecturerServices.map((ls) => (
                      <span
                        key={ls.service.id}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                      >
                        {ls.service.name} ({ls.service.durationMinutes}m)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#143359] shrink-0" />
                  {lec.availabilities.length > 0 ? (
                    <span>
                      Jadwal terdekat:{" "}
                      <strong className="text-slate-800">
                        {formatDateTime(lec.availabilities[0].startAt, timezone)}
                      </strong>
                    </span>
                  ) : (
                    <span>Belum ada slot terbuka dalam waktu dekat</span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/student/lecturers/${lec.id}`}>Profil & Jadwal</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/student/book?lecturerId=${lec.id}`}>Buat Booking</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

