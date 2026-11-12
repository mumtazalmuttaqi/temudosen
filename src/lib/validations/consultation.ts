import { z } from "zod";

export const upsertConsultationSchema = z.object({
  privateNotes: z
    .string()
    .trim()
    .max(4000, "Catatan privat maksimal 4000 karakter.")
    .optional()
    .nullable(),
  studentVisibleNotes: z
    .string()
    .trim()
    .max(4000, "Catatan untuk mahasiswa maksimal 4000 karakter.")
    .optional()
    .nullable(),
  recommendations: z
    .string()
    .trim()
    .max(4000, "Rekomendasi maksimal 4000 karakter.")
    .optional()
    .nullable(),
  followUpDate: z
    .string()
    .datetime({ message: "Format tanggal tindak lanjut tidak valid." })
    .optional()
    .nullable(),
});

export type UpsertConsultationInput = z.infer<typeof upsertConsultationSchema>;

