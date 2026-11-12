export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET wajib dikonfigurasi minimal 16 karakter pada production.");
    }
    return new TextEncoder().encode("temudosen-dev-fallback-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getDefaultCampusTimezone(): string {
  return process.env.DEFAULT_CAMPUS_TIMEZONE || "Asia/Jakarta";
}

