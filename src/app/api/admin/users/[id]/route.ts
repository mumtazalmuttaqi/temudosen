import { getClientIp } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { updateUserSchema } from "@/lib/validations/admin";
import { deleteUserAdmin, updateUserAdmin } from "@/server/services/admin-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: true,
        lecturerProfile: true,
      },
    });
    if (!user) return jsonError("Pengguna tidak ditemukan.", 404);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateUserSchema.parse(body);

    const user = await updateUserAdmin({
      actor: auth.user,
      userId: id,
      input: parsed,
      ipAddress: getClientIp(request),
    });
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request, ["ADMIN"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const result = await deleteUserAdmin({
      actor: auth.user,
      userId: id,
      ipAddress: getClientIp(request),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

