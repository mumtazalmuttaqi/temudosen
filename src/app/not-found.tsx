import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <FileQuestion className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kode 404</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tautan yang Anda tuju tidak tersedia atau data yang dimaksud telah dipindahkan.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#143359] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c4477] transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

