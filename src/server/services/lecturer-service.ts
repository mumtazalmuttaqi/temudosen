import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "./errors";

export async function listLecturers(params: {
  q?: string;
  faculty?: string;
  serviceId?: string;
  page?: number;
  limit?: number;
}) {
  const { q, faculty, serviceId, page = 1, limit = 24 } = params;

  let topicMatchedIds: string[] = [];
  if (q) {
    const pattern = `%${q}%`;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "lecturer_profiles"
      WHERE EXISTS (
        SELECT 1 FROM unnest("thesis_recommendations") AS rec
        WHERE rec ILIKE ${pattern}
      )
    `;
    topicMatchedIds = rows.map((r) => r.id);
  }

  const where: Prisma.LecturerProfileWhereInput = {
    user: { status: "ACTIVE", role: "LECTURER" },
    ...(faculty ? { faculty: { contains: faculty, mode: "insensitive" } } : {}),
    ...(serviceId
      ? {
          lecturerServices: {
            some: { serviceId },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { expertise: { contains: q, mode: "insensitive" } },
            { faculty: { contains: q, mode: "insensitive" } },
            { lecturerNumber: { contains: q, mode: "insensitive" } },
            { nip: { contains: q, mode: "insensitive" } },
            ...(topicMatchedIds.length > 0 ? [{ id: { in: topicMatchedIds } }] : []),
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.lecturerProfile.count({ where }),
    prisma.lecturerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        lecturerServices: {
          where: { service: { isActive: true } },
          include: {
            service: {
              select: { id: true, name: true, durationMinutes: true, description: true },
            },
          },
        },
        availabilities: {
          where: {
            status: "OPEN",
            endAt: { gt: new Date() },
          },
          select: { id: true, startAt: true, endAt: true },
          orderBy: { startAt: "asc" },
          take: 5,
        },
      },
      orderBy: { user: { name: "asc" } },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getLecturerById(lecturerId: string) {
  const lecturer = await prisma.lecturerProfile.findUnique({
    where: { id: lecturerId },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      lecturerServices: {
        where: { service: { isActive: true } },
        include: {
          service: {
            select: { id: true, name: true, durationMinutes: true, description: true },
          },
        },
      },
      availabilities: {
        where: {
          status: "OPEN",
          endAt: { gt: new Date() },
        },
        orderBy: { startAt: "asc" },
        take: 30,
      },
    },
  });

  if (!lecturer || lecturer.user.status !== "ACTIVE") {
    throw new NotFoundError("Profil dosen tidak ditemukan atau sedang tidak aktif.");
  }

  return lecturer;
}

