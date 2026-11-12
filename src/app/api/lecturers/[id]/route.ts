import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { getLecturerById } from "@/server/services/lecturer-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const lecturer = await getLecturerById(id);
    return jsonOk({ lecturer });
  } catch (error) {
    return handleApiError(error);
  }
}

