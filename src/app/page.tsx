import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultHomeForRole } from "@/lib/permissions/rbac";

async function RedirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getDefaultHomeForRole(user.role));
  }
  return null;
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#143359] text-sm font-bold text-white">
              TD
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">TemuDosen</span>
              <span className="hidden sm:inline ml-2 text-xs text-slate-500">
                Sistem Booking Konsultasi Akademik
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#143359] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c4477] transition-colors"
            >
              Daftar Mahasiswa
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-[#0f2942] to-[#173d66] text-white py-16 sm:py-24 px-4">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3.5 py-1 text-xs font-medium text-blue-100">
              Platform Resmi Bimbingan & Konsultasi Kampus
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight">
              Jadwalkan Bimbingan Akademik Secara Terstruktur dan Bebas Bentrok
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-blue-100/90">
              Temukan jadwal ketersediaan dosen secara waktu nyata, ajukan sesi konsultasi tugas akhir atau KRS, pantau status persetujuan, dan akses catatan rekomendasi bimbingan dalam satu portal terpadu.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0f2942] shadow-sm hover:bg-blue-50 transition-colors"
              >
                Masuk ke Portal
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Registrasi Mahasiswa
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#143359]">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Slot Ketersediaan Akurat
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Sistem mengunci slot secara transaksional di server sehingga tidak ada jadwal ganda pada jam bimbingan yang sama.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Alur Bimbingan Terdokumentasi
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Dosen dapat mencatat tindak lanjut, rekomendasi, serta catatan pribadi terpisah yang terjaga privasinya.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Tata Kelola & Audit Kampus
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Administrator mengelola akun, layanan konsultasi, laporan ekspor CSV, serta kebijakan operasional kampus secara fleksibel.
              </p>
            </div>
          </div>
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900">Sudah memiliki akun akademik?</h3>
                <p className="text-sm text-slate-600">
                  Masuk sebagai Mahasiswa, Dosen, atau Administrator menggunakan email resmi Anda.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-lg bg-[#143359] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1c4477]"
            >
              Masuk Sekarang
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © 2026 TemuDosen — Sistem Booking Konsultasi dan Bimbingan Akademik.
      </footer>
    </div>
  );
}
