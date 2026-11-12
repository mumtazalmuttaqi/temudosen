import type { UserRole, UserStatus } from "@prisma/client";
import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { createUserSchema } from "@/lib/validations/admin";
import { createUserAdmin, listUsersAdmin } from "@/server/services/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const role = (searchParams.get("role") as UserRole | null) || undefined;
    const status = (searchParams.get("status") as UserStatus | null) || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "15") || 15));

    const data = await listUsersAdmin({ q, role, status, page, limit });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const parsed = createUserSchema.parse(body);

    const user = await createUserAdmin({
      actor: auth.user,
      input: parsed,
      ipAddress: getClientIp(request),
    });

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

