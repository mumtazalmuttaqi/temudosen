import { verifyCsrfOrigin } from "@/lib/auth/csrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { registerStudentSchema } from "@/lib/validations/auth";
import { registerStudentAccount } from "@/server/services/auth-service";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return jsonError("Origin permintaan tidak diizinkan.", 403);
    }

    const ip = getClientIp(request);
    const rate = checkRateLimit(`register:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!rate.allowed) {
      return jsonError("Terlalu banyak percobaan pendaftaran. Coba lagi beberapa saat.", 429);
    }

    const body = await request.json();
    const parsed = registerStudentSchema.parse(body);

    const { user, token } = await registerStudentAccount(parsed, ip);
    await setSessionCookie(token);

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

