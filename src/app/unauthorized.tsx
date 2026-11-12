import Link from "next/link";
import { Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Lock className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kode 401</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Autentikasi Diperlukan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sesi Anda belum aktif atau telah berakhir. Silakan masuk terlebih dahulu untuk mengakses halaman ini.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[#143359] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c4477] transition-colors"
          >
            Masuk ke Akun
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

