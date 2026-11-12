"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerStudentSchema, type RegisterStudentInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStudentInput>({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      studentNumber: "",
      programStudy: "",
      faculty: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterStudentInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setServerError(json.error?.message || "Registrasi gagal. Periksa data masukan Anda.");
        return;
      }

      toast.success("Akun mahasiswa berhasil dibuat!");
      router.push("/student/dashboard");
      router.refresh();
    } catch {
      setServerError("Tidak dapat menghubungi server. Silakan coba lagi.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#143359] text-sm font-bold text-white">
            TD
          </div>
          <CardTitle className="text-2xl">Registrasi Mahasiswa</CardTitle>
          <CardDescription>
            Lengkapi identitas mahasiswa untuk membuat akun booking konsultasi akademik.
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" placeholder="Contoh: Raka Pratama" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-rose-600">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Kampus</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@mhs.temudosen.ac.id"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="studentNumber">NIM</Label>
                <Input id="studentNumber" placeholder="2310511099" {...register("studentNumber")} />
                {errors.studentNumber ? (
                  <p className="text-xs text-rose-600">{errors.studentNumber.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="programStudy">Program Studi</Label>
                <Input id="programStudy" placeholder="Informatika" {...register("programStudy")} />
                {errors.programStudy ? (
                  <p className="text-xs text-rose-600">{errors.programStudy.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="faculty">Fakultas</Label>
                <Input
                  id="faculty"
                  placeholder="Fakultas Ilmu Komputer"
                  {...register("faculty")}
                />
                {errors.faculty ? (
                  <p className="text-xs text-rose-600">{errors.faculty.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 karakter (huruf besar, kecil, angka)"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-rose-600">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi kata sandi"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="text-xs text-rose-600">{errors.confirmPassword.message}</p>
                ) : null}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Mendaftarkan..." : "Daftar Sebagai Mahasiswa"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-[#143359] hover:underline">
              Masuk di sini
            </Link>
          </div>
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 text-xs text-slate-500 hover:text-slate-800">
        ← Kembali ke Beranda
      </Link>
    </main>
  );
}

