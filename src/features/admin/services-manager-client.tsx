"use client";

import { useEffect, useState } from "react";
import { Edit, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  _count: { bookings: number; lecturerServices: number };
}

export function ServicesManagerClient() {
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/services");
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat layanan.");
        }
        if (!cancelled) setItems(json.data.services ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat layanan.");
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

  function loadServices() {
    setRefreshTick((t) => t + 1);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setDurationMinutes("30");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(svc: ServiceRow) {
    setEditing(svc);
    setName(svc.name);
    setDescription(svc.description ?? "");
    setDurationMinutes(String(svc.durationMinutes));
    setIsActive(svc.isActive);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        description: description.trim() || null,
        durationMinutes: Number(durationMinutes),
        isActive,
      };
      const url = editing ? `/api/admin/services/${editing.id}` : "/api/admin/services";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menyimpan layanan.");
        return;
      }
      toast.success(editing ? "Layanan berhasil diperbarui." : "Layanan baru berhasil dibuat.");
      setDialogOpen(false);
      await loadServices();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menghapus layanan.");
        return;
      }
      toast.success("Layanan berhasil dihapus.");
      setDeleteTarget(null);
      await loadServices();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Kelola jenis layanan konsultasi dan durasi waktunya. Perubahan durasi tidak mengubah riwayat booking lama.
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Layanan
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadServices} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Belum Ada Layanan"
          description="Tambahkan layanan konsultasi akademik pertama Anda."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Layanan</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Total Booking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{svc.name}</p>
                    {svc.description ? (
                      <p className="text-xs text-slate-500 max-w-md">{svc.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{svc.durationMinutes} menit</TableCell>
                  <TableCell>{svc._count.bookings}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        svc.isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }
                    >
                      {svc.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                      <Edit className="h-3.5 w-3.5" />
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(svc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Ubah Layanan" : "Tambah Layanan Konsultasi"}</DialogTitle>
              <DialogDescription>
                Durasi layanan digunakan untuk mengunci slot waktu booking mahasiswa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Nama Layanan</Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Deskripsi</Label>
              <Textarea
                id="svc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-dur">Durasi (Menit)</Label>
              <Input
                id="svc-dur"
                type="number"
                min={10}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <Label htmlFor="svc-active">Status Aktif</Label>
              <Switch id="svc-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Layanan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus Layanan "${deleteTarget?.name}"?`}
        description="Layanan yang sudah memiliki riwayat booking tidak dapat dihapus permanen; nonaktifkan statusnya sebagai gantinya."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
