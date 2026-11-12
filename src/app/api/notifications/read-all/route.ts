import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const result = await prisma.notification.updateMany({
      where: { userId: auth.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return jsonOk({ markedCount: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}

