"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error.message);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kode 500</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Terjadi Gangguan Sistem</h1>
        <p className="mt-2 text-sm text-slate-600">
          Permintaan Anda tidak dapat diproses saat ini. Silakan muat ulang halaman atau coba kembali beberapa saat lagi.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[#143359] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c4477] transition-colors cursor-pointer"
          >
            Coba Lagi
          </button>
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

