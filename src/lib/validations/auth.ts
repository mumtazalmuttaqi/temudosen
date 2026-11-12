import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid.").toLowerCase(),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const registerStudentSchema = z
  .object({
    name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter.").max(120),
    email: z.string().trim().email("Format email tidak valid.").toLowerCase(),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter.")
      .max(100)
      .regex(/[A-Z]/, "Kata sandi wajib mengandung minimal 1 huruf besar.")
      .regex(/[a-z]/, "Kata sandi wajib mengandung minimal 1 huruf kecil.")
      .regex(/[0-9]/, "Kata sandi wajib mengandung minimal 1 angka."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
    studentNumber: z
      .string()
      .trim()
      .min(5, "NIM minimal 5 karakter.")
      .max(30)
      .regex(/^[A-Za-z0-9\-_.]+$/, "NIM hanya boleh berisi huruf, angka, dan tanda hubung."),
    programStudy: z.string().trim().min(2, "Program studi wajib diisi.").max(120),
    faculty: z.string().trim().min(2, "Fakultas wajib diisi.").max(120),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;

