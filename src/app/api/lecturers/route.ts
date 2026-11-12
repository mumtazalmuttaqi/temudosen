import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { listLecturers } from "@/server/services/lecturer-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const faculty = searchParams.get("faculty")?.trim() || undefined;
    const serviceId = searchParams.get("serviceId")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "12") || 12));

    const data = await listLecturers({ q, faculty, serviceId, page, limit });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

