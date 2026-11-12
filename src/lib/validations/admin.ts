import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(120),
  email: z.string().trim().email("Format email tidak valid.").toLowerCase(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(100),
  role: z.enum(["STUDENT", "LECTURER", "ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  studentNumber: z.string().trim().max(30).optional(),
  programStudy: z.string().trim().max(120).optional(),
  lecturerNumber: z.string().trim().max(30).optional(),
  expertise: z.string().trim().max(250).optional(),
  faculty: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(120).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  role: z.enum(["STUDENT", "LECTURER", "ADMIN"]).optional(),
  programStudy: z.string().trim().max(120).optional(),
  faculty: z.string().trim().max(120).optional(),
  expertise: z.string().trim().max(250).optional(),
  bio: z.string().trim().max(2000).optional().nullable(),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(3, "Nama layanan minimal 3 karakter.").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  durationMinutes: z.coerce
    .number()
    .int("Durasi harus bilangan bulat.")
    .min(10, "Durasi minimal 10 menit.")
    .max(240, "Durasi maksimal 240 menit."),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(3, "Nama layanan minimal 3 karakter.").max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  durationMinutes: z.coerce
    .number()
    .int("Durasi harus bilangan bulat.")
    .min(10, "Durasi minimal 10 menit.")
    .max(240, "Durasi maksimal 240 menit.")
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateSystemSettingsSchema = z.object({
  pendingHoldHours: z.coerce.number().int().min(1).max(168),
  cancellationCutoffHours: z.coerce.number().int().min(0).max(168),
  allowStudentCancelConfirmed: z.boolean(),
  confirmedCancelRequiresApproval: z.boolean(),
  scheduleChangeApprover: z.enum(["LECTURER", "ADMIN"]),
  studentCanViewAllNotes: z.boolean(),
  adminCanViewPrivateNotes: z.boolean(),
  campusTimezone: z.string().trim().min(3).max(60),
  allowOpenStudentRegistration: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;

