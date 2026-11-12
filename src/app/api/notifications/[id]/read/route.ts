import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { id } = await context.params;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Notifikasi tidak ditemukan.", 404);
    }
    if (existing.userId !== auth.user.id) {
      return jsonError("Anda tidak berhak mengakses notifikasi ini.", 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    return jsonOk({ notification: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

