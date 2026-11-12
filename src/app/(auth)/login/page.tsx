"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { getDefaultHomeForRole } from "@/lib/utils";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setServerError(json.error?.message || "Gagal masuk. Periksa kembali data Anda.");
        return;
      }

      const role = json.data.user.role;
      const defaultHome = getDefaultHomeForRole(role);
      const safeRedirect =
        redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
          ? redirectTarget
          : defaultHome;

      toast.success(`Selamat datang, ${json.data.user.name}!`);
      router.push(safeRedirect);
      router.refresh();
    } catch {
      setServerError("Tidak dapat menghubungi server. Silakan coba lagi.");
    }
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#143359] text-sm font-bold text-white">
          TD
        </div>
        <CardTitle className="text-2xl">Masuk ke TemuDosen</CardTitle>
        <CardDescription>
          Gunakan email dan kata sandi akun akademik Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
            >
              {serverError}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Kampus</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@temudosen.ac.id"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Kata Sandi</Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-rose-600">{errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Memproses..." : "Masuk"}
          </Button>

          <p className="text-center text-xs text-slate-500 pt-1">
            Lupa kata sandi? Hubungi administrator program studi untuk reset akun.
          </p>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          Mahasiswa belum memiliki akun?{" "}
          <Link href="/register" className="font-semibold text-[#143359] hover:underline">
            Daftar di sini
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<div className="h-96 w-full max-w-md rounded-xl bg-white border border-slate-200 animate-pulse" />}>
        <LoginFormContent />
      </Suspense>
      <Link href="/" className="mt-6 text-xs text-slate-500 hover:text-slate-800">
        ← Kembali ke Beranda
      </Link>
    </main>
  );
}
