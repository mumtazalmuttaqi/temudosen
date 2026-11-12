import { verifyCsrfOrigin } from "@/lib/auth/csrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { loginSchema } from "@/lib/validations/auth";
import { authenticateUser } from "@/server/services/auth-service";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return jsonError("Origin permintaan tidak diizinkan.", 403);
    }

    const ip = getClientIp(request);
    const rate = checkRateLimit(`login:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!rate.allowed) {
      return jsonError("Terlalu banyak percobaan login. Silakan tunggu 1 menit.", 429);
    }

    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const { user, token } = await authenticateUser(parsed, ip);
    await setSessionCookie(token);

    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

