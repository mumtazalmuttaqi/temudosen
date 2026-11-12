"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save } from "lucide-react";
import { toast } from "sonner";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { USER_ROLE_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

export function ProfileSettingsView({
  user,
  allServices = [],
  selectedServiceIds = [],
}: {
  user: AuthenticatedUser;
  allServices?: ServiceOption[];
  selectedServiceIds?: string[];
}) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [programStudy, setProgramStudy] = useState(user.studentProfile?.programStudy ?? "");
  const [faculty, setFaculty] = useState(
    user.studentProfile?.faculty ?? user.lecturerProfile?.faculty ?? ""
  );
  const [expertise, setExpertise] = useState(user.lecturerProfile?.expertise ?? "");
  const [bio, setBio] = useState(user.lecturerProfile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.lecturerProfile?.avatarUrl ?? "");
  const [thesisTopicsText, setThesisTopicsText] = useState(
    (user.lecturerProfile?.thesisRecommendations ?? []).join("\n")
  );
  const [serviceIds, setServiceIds] = useState<string[]>(selectedServiceIds);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload: Record<string, unknown> = { name };
      if (user.role === "STUDENT") {
        payload.programStudy = programStudy;
        payload.faculty = faculty;
      } else if (user.role === "LECTURER") {
        payload.expertise = expertise;
        payload.faculty = faculty;
        payload.bio = bio;
        payload.avatarUrl = avatarUrl || null;
        payload.thesisRecommendations = thesisTopicsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        payload.serviceIds = serviceIds;
      }

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal memperbarui profil.");
        return;
      }

      toast.success("Profil berhasil diperbarui.");
      router.refresh();
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message || "Gagal mengubah kata sandi.");
        return;
      }
      toast.success("Kata sandi berhasil diperbarui.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      toast.error("Gagal menghubungi server.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Identitas & Profil {USER_ROLE_LABELS[user.role]}</CardTitle>
          <CardDescription>
            Perbarui informasi akademik Anda yang ditampilkan di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user.email} disabled className="bg-slate-100" />
            </div>

            {user.studentProfile ? (
              <div className="space-y-1.5">
                <Label htmlFor="profile-nim">NIM</Label>
                <Input
                  id="profile-nim"
                  value={user.studentProfile.studentNumber}
                  disabled
                  className="bg-slate-100"
                />
              </div>
            ) : null}

            {user.lecturerProfile ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-nidn">NIDN</Label>
                  <Input
                    id="profile-nidn"
                    value={user.lecturerProfile.lecturerNumber}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-nip">NIP</Label>
                  <Input
                    id="profile-nip"
                    value={user.lecturerProfile.nip ?? "-"}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nama Lengkap</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {user.role === "STUDENT" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-prodi">Program Studi</Label>
                  <Input
                    id="profile-prodi"
                    value={programStudy}
                    onChange={(e) => setProgramStudy(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-faculty">Fakultas</Label>
                  <Input
                    id="profile-faculty"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}

            {user.role === "LECTURER" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-faculty">Fakultas</Label>
                  <Input
                    id="profile-faculty"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-expertise">Bidang Keahlian</Label>
                  <Input
                    id="profile-expertise"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-bio">Deskripsi Singkat / Bio</Label>
                  <Textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Jelaskan fokus bimbingan dan arahan konsultasi Anda..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-topics">
                    Rekomendasi Topik / Judul Skripsi (satu topik per baris)
                  </Label>
                  <Textarea
                    id="profile-topics"
                    value={thesisTopicsText}
                    onChange={(e) => setThesisTopicsText(e.target.value)}
                    placeholder="Contoh:&#10;Rekomendasi 1&#10;Rekomendasi 2&#10;Rekomendasi 3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-avatar">URL Foto Profil (Opsional)</Label>
                  <Input
                    id="profile-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                {allServices.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Layanan Konsultasi yang Dibuka</Label>
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                      {allServices.map((svc) => (
                        <label
                          key={svc.id}
                          className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={serviceIds.includes(svc.id)}
                            onChange={() => toggleService(svc.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[#143359]"
                          />
                          <span>
                            {svc.name}{" "}
                            <span className="text-xs text-slate-500">({svc.durationMinutes} mnt)</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <Button type="submit" disabled={savingProfile}>
              <Save className="h-4 w-4" />
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Keamanan Akun</CardTitle>
          <CardDescription>Ganti kata sandi akun Anda secara berkala.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Kata Sandi Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 karakter (huruf besar, kecil, angka)"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Konfirmasi Kata Sandi Baru</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword}>
              <KeyRound className="h-4 w-4" />
              {savingPassword ? "Memproses..." : "Ubah Kata Sandi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

