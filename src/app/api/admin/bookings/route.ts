import type { BookingStatus } from "@prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { listAdminBookings } from "@/server/services/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as BookingStatus | null) || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20") || 20));

    const data = await listAdminBookings({
      actor: auth.user,
      status,
      q,
      page,
      limit,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

