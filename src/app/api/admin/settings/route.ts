import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { updateSystemSettingsSchema } from "@/lib/validations/admin";
import { getAdminSettings, updateAdminSettings } from "@/server/services/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const settings = await getAdminSettings();
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = updateSystemSettingsSchema.parse(body);

    const settings = await updateAdminSettings({
      actor: auth.user,
      input: parsed,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

