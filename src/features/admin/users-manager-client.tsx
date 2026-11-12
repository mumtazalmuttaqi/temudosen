"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { UserRole, UserStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { UserStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { USER_ROLE_LABELS } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  studentProfile: {
    studentNumber: string;
    programStudy: string;
    faculty: string;
  } | null;
  lecturerProfile: {
    lecturerNumber: string;
    expertise: string;
    faculty: string;
    bio: string | null;
  } | null;
}

export function UsersManagerClient({
  fixedRole,
}: {
  fixedRole?: UserRole;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>(fixedRole ?? "ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>(fixedRole ?? "STUDENT");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formStudentNumber, setFormStudentNumber] = useState("");
  const [formProgramStudy, setFormProgramStudy] = useState("");
  const [formLecturerNumber, setFormLecturerNumber] = useState("");
  const [formExpertise, setFormExpertise] = useState("");
  const [formFaculty, setFormFaculty] = useState("");
  const [formBio, setFormBio] = useState("");
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [editFaculty, setEditFaculty] = useState("");
  const [editProgramStudy, setEditProgramStudy] = useState("");
  const [editExpertise, setEditExpertise] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "15" });
        if (q.trim()) params.set("q", q.trim());
        if (fixedRole) params.set("role", fixedRole);
        else if (role !== "ALL") params.set("role", role);
        if (status !== "ALL") params.set("status", status);

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error?.message || "Gagal memuat data pengguna.");
        }
        if (!cancelled) {
          setItems(json.data.items ?? []);
          setTotalPages(json.data.pagination?.totalPages ?? 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data pengguna.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [q, role, status, page, fixedRole, refreshTick]);

  function loadUsers() {
    setRefreshTick((t) => t + 1);
  }

  function openEditDialog(user: UserRow) {
    setEditTarget(user);
    setEditName(user.name);
    setEditStatus(user.status);
    setEditFaculty(user.studentProfile?.faculty ?? user.lecturerProfile?.faculty ?? "");
    setEditProgramStudy(user.studentProfile?.programStudy ?? "");
    setEditExpertise(user.lecturerProfile?.expertise ?? "");
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          status: "ACTIVE",
          ...(formRole === "STUDENT"
            ? {
                studentNumber: formStudentNumber,
                programStudy: formProgramStudy,
                faculty: formFaculty,
              }
            : {}),
          ...(formRole === "LECTURER"
            ? {
                lecturerNumber: formLecturerNumber,
                expertise: formExpertise,
                faculty: formFaculty,
                bio: formBio,
              }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal membuat pengguna baru.");
        return;
      }
      toast.success("Pengguna baru berhasil ditambahkan.");
      setCreateOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormStudentNumber("");
      setFormProgramStudy("");
      setFormLecturerNumber("");
      setFormExpertise("");
      setFormFaculty("");
      setFormBio("");
      await loadUsers();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        status: editStatus,
      };
      if (editTarget.role === "STUDENT") {
        payload.programStudy = editProgramStudy;
        payload.faculty = editFaculty;
      } else if (editTarget.role === "LECTURER") {
        payload.expertise = editExpertise;
        payload.faculty = editFaculty;
      }

      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal memperbarui pengguna.");
        return;
      }
      toast.success("Data pengguna berhasil diperbarui.");
      setEditTarget(null);
      await loadUsers();
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
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal menghapus pengguna.");
        return;
      }
      toast.success("Pengguna berhasil dihapus.");
      setDeleteTarget(null);
      await loadUsers();
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
          {fixedRole
            ? `Kelola daftar akun ${USER_ROLE_LABELS[fixedRole]} di sistem.`
            : "Kelola akun Mahasiswa, Dosen, dan Administrator."}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tambah {fixedRole ? USER_ROLE_LABELS[fixedRole] : "Pengguna"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama, email, NIM, atau NIDN..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {!fixedRole ? (
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Peran</SelectItem>
                <SelectItem value="STUDENT">Mahasiswa</SelectItem>
                <SelectItem value="LECTURER">Dosen</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Pengguna Tidak Ditemukan"
          description="Tidak ada akun yang cocok dengan kriteria filter Anda."
        />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama & Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Identitas Akademik</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {USER_ROLE_LABELS[u.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {u.studentProfile ? (
                        <>
                          NIM {u.studentProfile.studentNumber} • {u.studentProfile.programStudy}
                        </>
                      ) : u.lecturerProfile ? (
                        <>
                          NIDN {u.lecturerProfile.lecturerNumber} • {u.lecturerProfile.faculty}
                        </>
                      ) : (
                        <span>Akun Pengelola Sistem</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-1">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(u)}>
                        <Edit className="h-3.5 w-3.5" />
                        Ubah
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

      {/* Dialog Tambah Pengguna */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              <DialogDescription>Buat akun baru sesuai peran akademik.</DialogDescription>
            </DialogHeader>

            {!fixedRole ? (
              <div className="space-y-1.5">
                <Label>Peran</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Mahasiswa</SelectItem>
                    <SelectItem value="LECTURER">Dosen</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cu-name">Nama Lengkap</Label>
                <Input
                  id="cu-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-email">Email</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-pwd">Kata Sandi Awal</Label>
                <Input
                  id="cu-pwd"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              {formRole === "STUDENT" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-nim">NIM</Label>
                    <Input
                      id="cu-nim"
                      value={formStudentNumber}
                      onChange={(e) => setFormStudentNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-prodi">Program Studi</Label>
                    <Input
                      id="cu-prodi"
                      value={formProgramStudy}
                      onChange={(e) => setFormProgramStudy(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cu-fac">Fakultas</Label>
                    <Input
                      id="cu-fac"
                      value={formFaculty}
                      onChange={(e) => setFormFaculty(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : null}

              {formRole === "LECTURER" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-nidn">NIDN / NIP</Label>
                    <Input
                      id="cu-nidn"
                      value={formLecturerNumber}
                      onChange={(e) => setFormLecturerNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-lfac">Fakultas</Label>
                    <Input
                      id="cu-lfac"
                      value={formFaculty}
                      onChange={(e) => setFormFaculty(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cu-exp">Bidang Keahlian</Label>
                    <Input
                      id="cu-exp"
                      value={formExpertise}
                      onChange={(e) => setFormExpertise(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cu-bio">Deskripsi / Bio (Opsional)</Label>
                    <Textarea
                      id="cu-bio"
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Pengguna */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Ubah Data Pengguna</DialogTitle>
              <DialogDescription>{editTarget?.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="eu-name">Nama Lengkap</Label>
              <Input
                id="eu-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status Akun</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UserStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editTarget?.role === "STUDENT" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="eu-prodi">Program Studi</Label>
                  <Input
                    id="eu-prodi"
                    value={editProgramStudy}
                    onChange={(e) => setEditProgramStudy(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-fac">Fakultas</Label>
                  <Input
                    id="eu-fac"
                    value={editFaculty}
                    onChange={(e) => setEditFaculty(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {editTarget?.role === "LECTURER" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="eu-exp">Bidang Keahlian</Label>
                  <Input
                    id="eu-exp"
                    value={editExpertise}
                    onChange={(e) => setEditExpertise(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-lfac">Fakultas</Label>
                  <Input
                    id="eu-lfac"
                    value={editFaculty}
                    onChange={(e) => setEditFaculty(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus Pengguna ${deleteTarget?.name}?`}
        description="Penghapusan permanen hanya berlaku bagi akun yang belum memiliki riwayat booking. Jika sudah memiliki riwayat, ubah status menjadi Nonaktif."
        confirmLabel="Ya, Hapus"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
