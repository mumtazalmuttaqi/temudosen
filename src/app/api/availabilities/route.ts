import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { createAvailabilitySchema } from "@/lib/validations/availability";
import {
  createLecturerAvailability,
  listMyAvailabilities,
} from "@/server/services/availability-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

    const availabilities = await listMyAvailabilities(auth.user, from, to);
    return jsonOk({ availabilities });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = createAvailabilitySchema.parse(body);

    const availability = await createLecturerAvailability({
      actor: auth.user,
      startAt: new Date(parsed.startAt),
      endAt: new Date(parsed.endAt),
      status: parsed.status,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ availability }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

