import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { createServiceSchema } from "@/lib/validations/admin";
import { createServiceAdmin, listServicesAdmin } from "@/server/services/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const services = await listServicesAdmin(true);
    return jsonOk({ services });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = createServiceSchema.parse(body);

    const service = await createServiceAdmin({
      actor: auth.user,
      input: parsed,
      ipAddress: getClientIp(request),
    });
    return jsonOk({ service }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

