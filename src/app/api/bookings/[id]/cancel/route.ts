import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { cancelBookingSchema } from "@/lib/validations/booking";
import { cancelBooking } from "@/server/services/booking-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["STUDENT"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = cancelBookingSchema.parse(body);

    const booking = await cancelBooking({
      actor: auth.user,
      bookingId: id,
      reason: parsed.reason,
      ipAddress: getClientIp(request),
    });
    return jsonOk({ booking });
  } catch (error) {
    return handleApiError(error);
  }
}

