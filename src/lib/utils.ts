import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookingStatus, ScheduleChangeStatus, UserRole, UserStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(
  value: Date | string,
  timezone = "Asia/Jakarta",
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(date);
}

export function formatDateOnly(value: Date | string, timezone = "Asia/Jakarta"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTimeOnly(value: Date | string, timezone = "Asia/Jakarta"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTimeRange(
  startAt: Date | string,
  endAt: Date | string,
  timezone = "Asia/Jakarta"
): string {
  return `${formatTimeOnly(startAt, timezone)} – ${formatTimeOnly(endAt, timezone)}`;
}

export function getLocalDateKey(value: Date | string, timezone = "Asia/Jakarta"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "Menunggu Persetujuan",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Dikonfirmasi",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  REJECTED: {
    label: "Ditolak",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    dotClass: "bg-rose-500",
  },
  CANCELLED: {
    label: "Dibatalkan",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-500",
  },
  COMPLETED: {
    label: "Selesai",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    dotClass: "bg-blue-600",
  },
  NO_SHOW: {
    label: "Tidak Hadir",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-300",
    dotClass: "bg-zinc-500",
  },
};

export const SCHEDULE_CHANGE_STATUS_META: Record<
  ScheduleChangeStatus,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Menunggu Keputusan",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  APPROVED: {
    label: "Disetujui",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  REJECTED: {
    label: "Ditolak",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
  CANCELLED: {
    label: "Dibatalkan",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Mahasiswa",
  LECTURER: "Dosen",
  ADMIN: "Administrator",
};

export const USER_STATUS_META: Record<UserStatus, { label: string; badgeClass: string }> = {
  ACTIVE: {
    label: "Aktif",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  INACTIVE: {
    label: "Nonaktif",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  SUSPENDED: {
    label: "Ditangguhkan",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  // Prevent CSV formula injection in Excel/LibreOffice
  const safeStr = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function generateBookingCode(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TD-${y}${m}${d}-${randomPart}`;
}

export function getDefaultHomeForRole(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "LECTURER":
      return "/lecturer/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
  }
}
