import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { getBookingDetailForActor } from "@/server/services/booking-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const booking = await getBookingDetailForActor(auth.user, id);
    return jsonOk({ booking });
  } catch (error) {
    return handleApiError(error);
  }
}

