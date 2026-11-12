import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { updateProfileSchema } from "@/lib/validations/profile";
import { updateMyProfile } from "@/server/services/profile-service";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  return jsonOk({ user: auth.user });
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    const user = await updateMyProfile({
      actor: auth.user,
      input: parsed,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

