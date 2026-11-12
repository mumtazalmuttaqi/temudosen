"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsView({
  rolePrefix,
  timezone = "Asia/Jakarta",
}: {
  rolePrefix: "/student" | "/lecturer";
  timezone?: string;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notifications?limit=50");
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat notifikasi.");
        }
        if (!cancelled) {
          setItems(json.data.items);
          setUnreadCount(json.data.unreadCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat notifikasi.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  function loadNotifications() {
    setRefreshTick((t) => t + 1);
  }

  async function markOneRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) return;
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Gagal menandai notifikasi terbaca.");
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menandai semua terbaca.");
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      toast.success("Semua notifikasi ditandai sudah dibaca.");
    } catch {
      toast.error("Gagal menandai semua terbaca.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadNotifications} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            {unreadCount > 0
              ? `Anda memiliki ${unreadCount} notifikasi belum dibaca.`
              : "Semua notifikasi telah dibaca."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Tandai Semua Dibaca
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Belum Ada Notifikasi"
          description="Pemberitahuan mengenai pengajuan, persetujuan, dan catatan konsultasi akan tampil di sini."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isUnread = !item.readAt;
            const detailHref =
              item.relatedEntityType === "Booking" && item.relatedEntityId
                ? `${rolePrefix}/bookings/${item.relatedEntityId}`
                : null;

            return (
              <Card
                key={item.id}
                className={isUnread ? "border-blue-300 bg-blue-50/30" : "bg-white"}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isUnread ? (
                        <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Belum dibaca" />
                      ) : null}
                      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(item.createdAt, timezone)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{item.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {detailHref ? (
                      <Button asChild size="sm" variant="outline" onClick={() => isUnread && markOneRead(item.id)}>
                        <Link href={detailHref}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Lihat Detail
                        </Link>
                      </Button>
                    ) : null}
                    {isUnread ? (
                      <Button size="sm" variant="ghost" onClick={() => markOneRead(item.id)}>
                        Tandai Dibaca
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
