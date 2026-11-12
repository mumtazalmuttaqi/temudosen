"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save } from "lucide-react";
import { toast } from "sonner";
import type { CampusPolicy } from "@/server/policies/booking-policy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function SettingsClient({ initialSettings }: { initialSettings: CampusPolicy }) {
  const router = useRouter();
  const [form, setForm] = useState<CampusPolicy>(initialSettings);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menyimpan pengaturan.");
        return;
      }
      toast.success("Pengaturan kebijakan kampus berhasil diperbarui.");
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex items-start gap-3 text-sm text-blue-900">
        <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Konfigurasi Kebijakan Operasional Kampus</p>
          <p className="mt-0.5 text-xs text-blue-800">
            Nilai awal pada halaman ini adalah asumsi aman untuk development (seperti penahanan slot Pending 24 jam dan batas pembatalan 12 jam). Sesuaikan berdasarkan SK/SOP resmi kampus sebelum production.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aturan Penjadwalan & Pembatalan</CardTitle>
          <CardDescription>Parameter waktu penahanan dan pembatalan booking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pendingHoldHours">Lama Penahanan Pending (Jam)</Label>
              <Input
                id="pendingHoldHours"
                type="number"
                min={1}
                max={168}
                value={form.pendingHoldHours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pendingHoldHours: Number(e.target.value) || 24 }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cancellationCutoffHours">
                Batas Minimal Pembatalan Mahasiswa (Jam Sebelum Jadwal)
              </Label>
              <Input
                id="cancellationCutoffHours"
                type="number"
                min={0}
                max={168}
                value={form.cancellationCutoffHours}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cancellationCutoffHours: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Zona Waktu Resmi Kampus</Label>
              <Select
                value={form.campusTimezone}
                onValueChange={(v) => setForm((f) => ({ ...f, campusTimezone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB / UTC+7)</SelectItem>
                  <SelectItem value="Asia/Makassar">Asia/Makassar (WITA / UTC+8)</SelectItem>
                  <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT / UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Penyetuju Perubahan Jadwal</Label>
              <Select
                value={form.scheduleChangeApprover}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, scheduleChangeApprover: v as "LECTURER" | "ADMIN" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LECTURER">Dosen Pemilik Jadwal</SelectItem>
                  <SelectItem value="ADMIN">Administrator Kampus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <Label>Izinkan Mahasiswa Membatalkan Booking Confirmed</Label>
                <p className="text-xs text-slate-500">
                  Jika nonaktif, booking yang sudah dikonfirmasi tidak dapat dibatalkan sepihak.
                </p>
              </div>
              <Switch
                checked={form.allowStudentCancelConfirmed}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, allowStudentCancelConfirmed: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <Label>Pembatalan Booking Confirmed Memerlukan Persetujuan Dosen</Label>
                <p className="text-xs text-slate-500">
                  Mewajibkan konfirmasi dosen apabila status sudah Confirmed.
                </p>
              </div>
              <Switch
                checked={form.confirmedCancelRequiresApproval}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, confirmedCancelRequiresApproval: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privasi Catatan & Registrasi</CardTitle>
          <CardDescription>Pengaturan visibilitas catatan konsultasi dan pendaftaran akun.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label>Mahasiswa Dapat Melihat Seluruh Catatan Konsultasi</Label>
              <p className="text-xs text-slate-500">
                Default nonaktif: mahasiswa hanya melihat catatan yang dibagikan dosen.
              </p>
            </div>
            <Switch
              checked={form.studentCanViewAllNotes}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, studentCanViewAllNotes: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label>Administrator Boleh Melihat Catatan Privat Dosen</Label>
              <p className="text-xs text-slate-500">
                Default nonaktif sesuai prinsip privasi bimbingan akademik.
              </p>
            </div>
            <Switch
              checked={form.adminCanViewPrivateNotes}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, adminCanViewPrivateNotes: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label>Registrasi Mahasiswa Terbuka Mandiri</Label>
              <p className="text-xs text-slate-500">
                Jika nonaktif, akun mahasiswa hanya dapat dibuat oleh administrator.
              </p>
            </div>
            <Switch
              checked={form.allowOpenStudentRegistration}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, allowOpenStudentRegistration: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        <Save className="h-4 w-4" />
        {saving ? "Menyimpan..." : "Simpan Pengaturan Sistem"}
      </Button>
    </form>
  );
}

