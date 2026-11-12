import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "30") || 30));

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: auth.user.id,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: auth.user.id, readAt: null },
      }),
    ]);

    return jsonOk({ items, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

