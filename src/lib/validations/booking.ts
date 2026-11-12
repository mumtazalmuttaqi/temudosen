import { z } from "zod";

export const createBookingSchema = z.object({
  lecturerId: z.string().uuid("ID dosen tidak valid."),
  serviceId: z.string().uuid("ID layanan tidak valid."),
  startAt: z.string().datetime({ message: "Format waktu mulai tidak valid." }),
  topic: z
    .string()
    .trim()
    .min(5, "Topik konsultasi minimal 5 karakter.")
    .max(200, "Topik konsultasi maksimal 200 karakter."),
  additionalNotes: z
    .string()
    .trim()
    .max(1500, "Keterangan tambahan maksimal 1500 karakter.")
    .optional()
    .nullable(),
});

export const rejectBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Alasan penolakan wajib diisi (minimal 5 karakter).")
    .max(500, "Alasan penolakan maksimal 500 karakter."),
});

export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Alasan pembatalan wajib diisi (minimal 5 karakter).")
    .max(500, "Alasan pembatalan maksimal 500 karakter."),
});

export const scheduleChangeRequestSchema = z.object({
  proposedStartAt: z.string().datetime({ message: "Format waktu usulan tidak valid." }),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan perubahan jadwal minimal 5 karakter.")
    .max(500, "Alasan perubahan jadwal maksimal 500 karakter."),
});

export const decideScheduleChangeSchema = z.object({
  decisionReason: z
    .string()
    .trim()
    .max(500, "Catatan keputusan maksimal 500 karakter.")
    .optional()
    .nullable(),
});

export const rejectScheduleChangeSchema = z.object({
  decisionReason: z
    .string()
    .trim()
    .min(5, "Alasan penolakan perubahan jadwal wajib diisi (minimal 5 karakter).")
    .max(500, "Alasan penolakan maksimal 500 karakter."),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ScheduleChangeRequestInput = z.infer<typeof scheduleChangeRequestSchema>;

