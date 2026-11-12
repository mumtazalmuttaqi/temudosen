"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
}

export function AuditLogsClient({ timezone = "Asia/Jakarta" }: { timezone?: string }) {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (q.trim()) params.set("q", q.trim());
        if (entityType !== "ALL") params.set("entityType", entityType);

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat audit log.");
        }
        if (!cancelled) {
          setItems(json.data.items ?? []);
          setTotalPages(json.data.pagination?.totalPages ?? 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat audit log.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [q, entityType, page, refreshTick]);

  function loadLogs() {
    setRefreshTick((t) => t + 1);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari aksi, ID entitas, atau nama aktor..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={entityType}
            onValueChange={(v) => {
              setEntityType(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Entitas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Entitas</SelectItem>
              <SelectItem value="Booking">Booking</SelectItem>
              <SelectItem value="Availability">Availability</SelectItem>
              <SelectItem value="Consultation">Consultation</SelectItem>
              <SelectItem value="ScheduleChangeRequest">ScheduleChangeRequest</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="SystemSetting">SystemSetting</SelectItem>
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
        <ErrorState message={error} onRetry={loadLogs} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Belum Ada Audit Log"
          description="Belum ada catatan aktivitas untuk filter yang dipilih."
        />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu ({timezone})</TableHead>
                  <TableHead>Aktor</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Metadata Aman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.createdAt, timezone)}
                    </TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.actor.name}</p>
                          <p className="text-xs text-slate-500">{log.actor.role}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Sistem Otomatis</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-[#143359]">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-slate-800">{log.entityType}</span>
                      <p className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                        {log.entityId}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <span className="text-xs text-slate-600">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
