import type { AuthenticatedUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { DomainError } from "./errors";

export async function updateMyProfile(params: {
  actor: AuthenticatedUser;
  input: {
    name: string;
    programStudy?: string;
    faculty?: string;
    expertise?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    serviceIds?: string[];
  };
  ipAddress?: string | null;
}) {
  const { actor, input, ipAddress } = params;

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: actor.id },
      data: {
        name: input.name,
        ...(actor.role === "STUDENT" && actor.studentProfile
          ? {
              studentProfile: {
                update: {
                  ...(input.programStudy ? { programStudy: input.programStudy } : {}),
                  ...(input.faculty ? { faculty: input.faculty } : {}),
                },
              },
            }
          : {}),
        ...(actor.role === "LECTURER" && actor.lecturerProfile
          ? {
              lecturerProfile: {
                update: {
                  ...(input.expertise ? { expertise: input.expertise } : {}),
                  ...(input.faculty ? { faculty: input.faculty } : {}),
                  ...(input.bio !== undefined ? { bio: input.bio } : {}),
                  ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        studentProfile: true,
        lecturerProfile: true,
      },
    });

    if (actor.role === "LECTURER" && actor.lecturerProfile && input.serviceIds) {
      const validServices = await tx.service.findMany({
        where: { id: { in: input.serviceIds }, isActive: true },
        select: { id: true },
      });
      await tx.lecturerService.deleteMany({
        where: { lecturerId: actor.lecturerProfile.id },
      });
      if (validServices.length > 0) {
        await tx.lecturerService.createMany({
          data: validServices.map((s) => ({
            lecturerId: actor.lecturerProfile!.id,
            serviceId: s.id,
          })),
        });
      }
    }

    await recordAuditLog({
      actorUserId: actor.id,
      action: "PROFILE_UPDATE",
      entityType: "User",
      entityId: actor.id,
      metadata: { role: actor.role },
      ipAddress,
      tx,
    });

    return updatedUser;
  });
}

export async function changeMyPassword(params: {
  actor: AuthenticatedUser;
  currentPassword: string;
  newPassword: string;
  ipAddress?: string | null;
}) {
  const { actor, currentPassword, newPassword, ipAddress } = params;
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    throw new DomainError("Pengguna tidak ditemukan.", 404, "NOT_FOUND");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new DomainError("Kata sandi saat ini tidak sesuai.", 400, "INVALID_PASSWORD");
  }

  const nextHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: { passwordHash: nextHash },
    });
    await recordAuditLog({
      actorUserId: actor.id,
      action: "PASSWORD_CHANGE",
      entityType: "User",
      entityId: actor.id,
      metadata: {},
      ipAddress,
      tx,
    });
  });

  return { changed: true };
}

