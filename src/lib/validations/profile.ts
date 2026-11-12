import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(120),
  programStudy: z.string().trim().min(2).max(120).optional(),
  faculty: z.string().trim().min(2).max(120).optional(),
  expertise: z.string().trim().min(2).max(1000).optional(),
  bio: z.string().trim().max(2000).optional().nullable(),
  thesisRecommendations: z.array(z.string().trim().min(1).max(600)).max(10).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => !val || val.startsWith("/") || val.startsWith("https://") || val.startsWith("http://"),
      "URL foto harus berupa tautan http/https atau path relatif yang valid."
    )
    .optional()
    .nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    newPassword: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter.")
      .max(100)
      .regex(/[A-Z]/, "Kata sandi baru wajib mengandung minimal 1 huruf besar.")
      .regex(/[a-z]/, "Kata sandi baru wajib mengandung minimal 1 huruf kecil.")
      .regex(/[0-9]/, "Kata sandi baru wajib mengandung minimal 1 angka."),
    confirmNewPassword: z.string().min(1, "Konfirmasi kata sandi baru wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Konfirmasi kata sandi baru tidak cocok.",
    path: ["confirmNewPassword"],
  });

