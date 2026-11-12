import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        isActive: true,
      },
    });

    return jsonOk({ services });
  } catch (error) {
    return handleApiError(error);
  }
}

