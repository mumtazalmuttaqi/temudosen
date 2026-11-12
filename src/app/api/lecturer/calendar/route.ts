import { prisma } from "@/lib/db/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { requireApiUser } from "@/lib/permissions/rbac";
import { getCampusPolicy } from "@/server/policies/settings-service";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request, ["LECTURER"]);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    if (!auth.user.lecturerProfile) {
      return jsonError("Profil dosen tidak ditemukan.", 403);
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const lecturerId = auth.user.lecturerProfile.id;
    const [policy, availabilities, bookings] = await Promise.all([
      getCampusPolicy(),
      prisma.availability.findMany({
        where: {
          lecturerId,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          lecturerId,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        include: {
          service: { select: { id: true, name: true, durationMinutes: true } },
          student: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startAt: "asc" },
      }),
    ]);

    return jsonOk({
      campusTimezone: policy.campusTimezone,
      availabilities,
      bookings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

