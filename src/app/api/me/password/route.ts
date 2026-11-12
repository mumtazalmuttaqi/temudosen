import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { changePasswordSchema } from "@/lib/validations/profile";
import { changeMyPassword } from "@/server/services/profile-service";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const ip = getClientIp(request);
    const rate = checkRateLimit(`pwd:${auth.user.id}:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!rate.allowed) {
      return jsonError("Terlalu banyak percobaan ubah kata sandi. Tunggu sebentar.", 429);
    }

    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    const result = await changeMyPassword({
      actor: auth.user,
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
      ipAddress: ip,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

