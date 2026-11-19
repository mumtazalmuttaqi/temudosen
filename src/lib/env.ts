export function getSessionSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "temudosen-prod-secret-session-jwt-key-32chars-min-2026";
  return new TextEncoder().encode(secret);
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getDefaultCampusTimezone(): string {
  return process.env.DEFAULT_CAMPUS_TIMEZONE || "Asia/Jakarta";
}

