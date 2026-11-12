import type { BookingStatus } from "@prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { getAdminReportData } from "@/server/services/report-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const status = (searchParams.get("status") as BookingStatus | null) || undefined;
    const lecturerId = searchParams.get("lecturerId") || undefined;
    const serviceId = searchParams.get("serviceId") || undefined;

    const data = await getAdminReportData({
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      status,
      lecturerId,
      serviceId,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

