import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { rejectScheduleChangeSchema } from "@/lib/validations/booking";
import { rejectScheduleChangeRequest } from "@/server/services/schedule-change-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["LECTURER", "ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = rejectScheduleChangeSchema.parse(body);

    const scheduleChangeRequest = await rejectScheduleChangeRequest({
      actor: auth.user,
      requestId: id,
      decisionReason: parsed.decisionReason,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ scheduleChangeRequest });
  } catch (error) {
    return handleApiError(error);
  }
}

