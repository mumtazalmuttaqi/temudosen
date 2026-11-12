import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { updateServiceSchema } from "@/lib/validations/admin";
import { deleteServiceAdmin, updateServiceAdmin } from "@/server/services/admin-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateServiceSchema.parse(body);

    const service = await updateServiceAdmin({
      actor: auth.user,
      serviceId: id,
      input: parsed,
      ipAddress: getClientIp(request),
    });
    return jsonOk({ service });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const result = await deleteServiceAdmin({
      actor: auth.user,
      serviceId: id,
      ipAddress: getClientIp(request),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

