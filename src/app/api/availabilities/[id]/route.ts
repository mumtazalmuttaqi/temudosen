import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { updateAvailabilitySchema } from "@/lib/validations/availability";
import {
  deleteLecturerAvailability,
  updateLecturerAvailability,
} from "@/server/services/availability-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAvailabilitySchema.parse(body);

    const availability = await updateLecturerAvailability({
      actor: auth.user,
      availabilityId: id,
      startAt: parsed.startAt ? new Date(parsed.startAt) : undefined,
      endAt: parsed.endAt ? new Date(parsed.endAt) : undefined,
      status: parsed.status,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ availability });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const result = await deleteLecturerAvailability({
      actor: auth.user,
      availabilityId: id,
      ipAddress: getClientIp(request),
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

