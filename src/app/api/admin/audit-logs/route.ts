import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { listAuditLogsAdmin } from "@/server/services/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action")?.trim() || undefined;
    const entityType = searchParams.get("entityType")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "25") || 25));

    const data = await listAuditLogsAdmin({ action, entityType, q, page, limit });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

