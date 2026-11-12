import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { rejectBookingSchema } from "@/lib/validations/booking";
import { rejectBooking } from "@/server/services/booking-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = rejectBookingSchema.parse(body);

    const booking = await rejectBooking({
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

