import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { scheduleChangeRequestSchema } from "@/lib/validations/booking";
import { createScheduleChangeRequest } from "@/server/services/schedule-change-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["STUDENT"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = scheduleChangeRequestSchema.parse(body);

    const scheduleChangeRequest = await createScheduleChangeRequest({
      actor: auth.user,
      bookingId: id,
      proposedStartAt: new Date(parsed.proposedStartAt),
      reason: parsed.reason,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ scheduleChangeRequest }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

