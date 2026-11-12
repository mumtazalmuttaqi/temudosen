import { getAppUrl } from "@/lib/env";

/**
 * Memastikan permintaan mutasi berasal dari origin yang sah (proteksi CSRF berlapis di samping SameSite=Lax).
 */
export function verifyCsrfOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Permintaan non-browser (seperti server-side integration tests tanpa Origin) tetap diizinkan
  // bila tidak membawa Origin maupun Referer yang menyimpang.
  if (!origin && !referer) {
    return true;
  }

  const allowedOrigins = new Set<string>();
  try {
    allowedOrigins.add(new URL(getAppUrl()).origin);
  } catch {
    // ignore invalid NEXT_PUBLIC_APP_URL
  }
  if (host) {
    allowedOrigins.add(`http://${host}`);
    allowedOrigins.add(`https://${host}`);
  }

  if (origin) {
    return allowedOrigins.has(origin);
  }

  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return false;
}

