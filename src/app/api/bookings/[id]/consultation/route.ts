import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { upsertConsultationSchema } from "@/lib/validations/consultation";
import { upsertConsultationNotes } from "@/server/services/consultation-service";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = upsertConsultationSchema.parse(body);

    const consultation = await upsertConsultationNotes({
      actor: auth.user,
      bookingId: id,
      input: parsed,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ consultation });
  } catch (error) {
    return handleApiError(error);
  }
}

