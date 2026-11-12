import type { BookingStatus } from "@prisma/client";
import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { createBookingSchema } from "@/lib/validations/booking";
import { createBooking, listStudentBookings } from "@/server/services/booking-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["STUDENT"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as BookingStatus | null;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20") || 20));

    const data = await listStudentBookings({
      actor: auth.user,
      status: statusParam || undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      page,
      limit,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["STUDENT"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = createBookingSchema.parse(body);

    const booking = await createBooking({
      actor: auth.user,
      lecturerId: parsed.lecturerId,
      serviceId: parsed.serviceId,
      startAt: new Date(parsed.startAt),
      topic: parsed.topic,
      additionalNotes: parsed.additionalNotes,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ booking }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

