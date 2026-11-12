import { z } from "zod";

export const createAvailabilitySchema = z
  .object({
    startAt: z.string().datetime({ message: "Format waktu mulai harus ISO UTC yang valid." }),
    endAt: z.string().datetime({ message: "Format waktu selesai harus ISO UTC yang valid." }),
    status: z.enum(["OPEN", "CLOSED"]).optional().default("OPEN"),
  })
  .refine((data) => new Date(data.startAt).getTime() < new Date(data.endAt).getTime(), {
    message: "Waktu mulai harus lebih awal dari waktu selesai.",
    path: ["endAt"],
  });

export const updateAvailabilitySchema = z
  .object({
    startAt: z.string().datetime({ message: "Format waktu mulai tidak valid." }).optional(),
    endAt: z.string().datetime({ message: "Format waktu selesai tidak valid." }).optional(),
    status: z.enum(["OPEN", "CLOSED"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return new Date(data.startAt).getTime() < new Date(data.endAt).getTime();
      }
      return true;
    },
    {
      message: "Waktu mulai harus lebih awal dari waktu selesai.",
      path: ["endAt"],
    }
  );

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

