import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { getAvailableSlotsForLecturer } from "@/server/services/booking-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id: lecturerId } = await context.params;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const from = fromParam ? new Date(fromParam) : now;
    const to = toParam
      ? new Date(toParam)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      return jsonError("Rentang tanggal tidak valid.", 400);
    }

    if (serviceId) {
      const result = await getAvailableSlotsForLecturer({
        lecturerId,
        serviceId,
        from,
        to,
      });
      return jsonOk(result);
    }

    // Jika serviceId tidak dikirim, kembalikan jendela ketersediaan OPEN
    const availabilities = await prisma.availability.findMany({
      where: {
        lecturerId,
        status: "OPEN",
        startAt: { lt: to },
        endAt: { gt: from },
      },
      orderBy: { startAt: "asc" },
    });

    return jsonOk({ lecturerId, availabilities });
  } catch (error) {
    return handleApiError(error);
  }
}

