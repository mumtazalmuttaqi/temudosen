import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import type {
  CreateServiceInput,
  CreateUserInput,
  UpdateServiceInput,
  UpdateSystemSettingsInput,
  UpdateUserInput,
} from "@/lib/validations/admin";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { sanitizeConsultationForActor } from "@/server/policies/access-policy";
import { ensureSystemSettings, getCampusPolicy } from "@/server/policies/settings-service";
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from "./errors";

export async function listUsersAdmin(params: {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}) {
  const { q, role, status, page = 1, limit = 15 } = params;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { studentProfile: { studentNumber: { contains: q, mode: "insensitive" } } },
            { lecturerProfile: { lecturerNumber: { contains: q, mode: "insensitive" } } },
            { lecturerProfile: { nip: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
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

export async function createUserAdmin(params: {
  actor: AuthenticatedUser;
  input: CreateUserInput;
  ipAddress?: string | null;
}) {
  const { actor, input, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat menambah pengguna.");
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  if (existingEmail) {
    throw new ConflictError("Email sudah digunakan oleh pengguna lain.");
  }

  if (input.role === "STUDENT") {
    if (!input.studentNumber || !input.programStudy || !input.faculty) {
      throw new DomainError(
        "NIM, Program Studi, dan Fakultas wajib diisi untuk akun Mahasiswa.",
        400,
        "MISSING_STUDENT_PROFILE"
      );
    }
    const existingNim = await prisma.studentProfile.findUnique({
      where: { studentNumber: input.studentNumber },
      select: { id: true },
    });
    if (existingNim) {
      throw new ConflictError("NIM sudah terdaftar.");
    }
  }

  if (input.role === "LECTURER") {
    if (!input.lecturerNumber || !input.expertise || !input.faculty) {
      throw new DomainError(
        "NIDN/NIP, Bidang Keahlian, dan Fakultas wajib diisi untuk akun Dosen.",
        400,
        "MISSING_LECTURER_PROFILE"
      );
    }
    const existingNidn = await prisma.lecturerProfile.findUnique({
      where: { lecturerNumber: input.lecturerNumber },
      select: { id: true },
    });
    if (existingNidn) {
      throw new ConflictError("NIDN dosen sudah terdaftar.");
    }
    if (input.nip) {
      const existingNip = await prisma.lecturerProfile.findUnique({
        where: { nip: input.nip },
        select: { id: true },
      });
      if (existingNip) {
        throw new ConflictError("NIP dosen sudah terdaftar.");
      }
    }
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const activeServices =
      input.role === "LECTURER"
        ? await tx.service.findMany({ where: { isActive: true }, select: { id: true } })
        : [];

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        status: input.status,
        ...(input.role === "STUDENT"
          ? {
              studentProfile: {
                create: {
                  studentNumber: input.studentNumber!,
                  programStudy: input.programStudy!,
                  faculty: input.faculty!,
                },
              },
            }
          : {}),
        ...(input.role === "LECTURER"
          ? {
              lecturerProfile: {
                create: {
                  lecturerNumber: input.lecturerNumber!,
                  nip: input.nip || null,
                  expertise: input.expertise!,
                  faculty: input.faculty!,
                  bio: input.bio || null,
                  thesisRecommendations: input.thesisRecommendations ?? [],
                  lecturerServices: {
                    create: activeServices.map((s) => ({ serviceId: s.id })),
                  },
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
        createdAt: true,
        studentProfile: true,
        lecturerProfile: true,
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_USER_CREATE",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role, status: user.status, email: user.email },
      ipAddress,
      tx,
    });

    return user;
  });
}

export async function updateUserAdmin(params: {
  actor: AuthenticatedUser;
  userId: string;
  input: UpdateUserInput;
  ipAddress?: string | null;
}) {
  const { actor, userId, input, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat memperbarui pengguna.");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, lecturerProfile: true },
  });
  if (!existing) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }

  if (actor.id === userId) {
    if (input.status && input.status !== "ACTIVE") {
      throw new ConflictError("Anda tidak dapat menonaktifkan akun administrator Anda sendiri.");
    }
    if (input.role && input.role !== "ADMIN") {
      throw new ConflictError("Anda tidak dapat menurunkan peran akun Anda sendiri.");
    }
  }

  if (input.role && input.role !== existing.role) {
    throw new ConflictError(
      "Perubahan peran antar-aktor tidak diperbolehkan pada akun yang sudah memiliki profil terikat. Buat akun baru sesuai peran yang tepat."
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(existing.role === "STUDENT" && existing.studentProfile
          ? {
              studentProfile: {
                update: {
                  ...(input.programStudy !== undefined
                    ? { programStudy: input.programStudy }
                    : {}),
                  ...(input.faculty !== undefined ? { faculty: input.faculty } : {}),
                },
              },
            }
          : {}),
        ...(existing.role === "LECTURER" && existing.lecturerProfile
          ? {
              lecturerProfile: {
                update: {
                  ...(input.nip !== undefined ? { nip: input.nip } : {}),
                  ...(input.expertise !== undefined ? { expertise: input.expertise } : {}),
                  ...(input.faculty !== undefined ? { faculty: input.faculty } : {}),
                  ...(input.bio !== undefined ? { bio: input.bio } : {}),
                  ...(input.thesisRecommendations !== undefined
                    ? { thesisRecommendations: input.thesisRecommendations }
                    : {}),
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
        createdAt: true,
        studentProfile: true,
        lecturerProfile: true,
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_USER_UPDATE",
      entityType: "User",
      entityId: userId,
      metadata: {
        updatedFields: Object.keys(input),
        status: updated.status,
      },
      ipAddress,
      tx,
    });

    return updated;
  });
}

export async function deleteUserAdmin(params: {
  actor: AuthenticatedUser;
  userId: string;
  ipAddress?: string | null;
}) {
  const { actor, userId, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat menghapus pengguna.");
  }
  if (actor.id === userId) {
    throw new ConflictError("Anda tidak dapat menghapus akun Anda sendiri.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: { include: { _count: { select: { bookings: true } } } },
      lecturerProfile: { include: { _count: { select: { bookings: true } } } },
    },
  });
  if (!user) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }

  const bookingCount =
    (user.studentProfile?._count.bookings ?? 0) + (user.lecturerProfile?._count.bookings ?? 0);
  if (bookingCount > 0) {
    throw new ConflictError(
      "Pengguna memiliki riwayat booking sehingga tidak dapat dihapus permanen. Ubah status akun menjadi Nonaktif atau Ditangguhkan."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: userId } });
    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_USER_DELETE",
      entityType: "User",
      entityId: userId,
      metadata: { email: user.email, role: user.role },
      ipAddress,
      tx,
    });
  });

  return { deleted: true, id: userId };
}

export async function listServicesAdmin(includeInactive = true) {
  return prisma.service.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { bookings: true, lecturerServices: true } },
    },
  });
}

export async function createServiceAdmin(params: {
  actor: AuthenticatedUser;
  input: CreateServiceInput;
  ipAddress?: string | null;
}) {
  const { actor, input, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat menambah layanan.");
  }

  const dup = await prisma.service.findUnique({
    where: { name: input.name },
    select: { id: true },
  });
  if (dup) {
    throw new ConflictError("Nama layanan sudah ada.");
  }

  return prisma.$transaction(async (tx) => {
    const lecturers = await tx.lecturerProfile.findMany({ select: { id: true } });
    const service = await tx.service.create({
      data: {
        name: input.name,
        description: input.description || null,
        durationMinutes: input.durationMinutes,
        isActive: input.isActive,
        lecturerServices: {
          create: lecturers.map((l) => ({ lecturerId: l.id })),
        },
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_SERVICE_CREATE",
      entityType: "Service",
      entityId: service.id,
      metadata: {
        name: service.name,
        durationMinutes: service.durationMinutes,
        isActive: service.isActive,
      },
      ipAddress,
      tx,
    });

    return service;
  });
}

export async function updateServiceAdmin(params: {
  actor: AuthenticatedUser;
  serviceId: string;
  input: UpdateServiceInput;
  ipAddress?: string | null;
}) {
  const { actor, serviceId, input, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat mengubah layanan.");
  }

  const existing = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!existing) {
    throw new NotFoundError("Layanan tidak ditemukan.");
  }

  if (input.name && input.name !== existing.name) {
    const dup = await prisma.service.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictError("Nama layanan sudah digunakan.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.durationMinutes !== undefined
          ? { durationMinutes: input.durationMinutes }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_SERVICE_UPDATE",
      entityType: "Service",
      entityId: serviceId,
      metadata: {
        name: updated.name,
        durationMinutes: updated.durationMinutes,
        isActive: updated.isActive,
      },
      ipAddress,
      tx,
    });

    return updated;
  });
}

export async function deleteServiceAdmin(params: {
  actor: AuthenticatedUser;
  serviceId: string;
  ipAddress?: string | null;
}) {
  const { actor, serviceId, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat menghapus layanan.");
  }

  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) {
    throw new NotFoundError("Layanan tidak ditemukan.");
  }
  if (existing._count.bookings > 0) {
    throw new ConflictError(
      "Layanan sudah digunakan dalam riwayat booking sehingga tidak dapat dihapus. Nonaktifkan layanan sebagai gantinya."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id: serviceId } });
    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_SERVICE_DELETE",
      entityType: "Service",
      entityId: serviceId,
      metadata: { name: existing.name },
      ipAddress,
      tx,
    });
  });

  return { deleted: true, id: serviceId };
}

export async function listAdminBookings(params: {
  actor: AuthenticatedUser;
  status?: Prisma.BookingWhereInput["status"];
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { actor, status, q, page = 1, limit = 20 } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat melihat seluruh booking.");
  }

  const policy = await getCampusPolicy();
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { bookingCode: { contains: q, mode: "insensitive" } },
            { topic: { contains: q, mode: "insensitive" } },
            { student: { user: { name: { contains: q, mode: "insensitive" } } } },
            { lecturer: { user: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, rawItems] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, durationMinutes: true } },
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        lecturer: { include: { user: { select: { id: true, name: true, email: true } } } },
        consultation: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const items = rawItems.map((b) => ({
    ...b,
    consultation: sanitizeConsultationForActor({
      actor,
      booking: b,
      consultation: b.consultation,
      policy,
    }),
  }));

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

export async function listAuditLogsAdmin(params: {
  action?: string;
  entityType?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { action, entityType, q, page = 1, limit = 25 } = params;
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(entityType ? { entityType: { equals: entityType } } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
            { actor: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
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

export async function getAdminSettings() {
  return ensureSystemSettings();
}

export async function updateAdminSettings(params: {
  actor: AuthenticatedUser;
  input: UpdateSystemSettingsInput;
  ipAddress?: string | null;
}) {
  const { actor, input, ipAddress } = params;
  if (actor.role !== "ADMIN") {
    throw new ForbiddenError("Hanya administrator yang dapat memperbarui pengaturan sistem.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.systemSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });

    await recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_SETTINGS_UPDATE",
      entityType: "SystemSetting",
      entityId: "1",
      metadata: input as unknown as Record<string, unknown>,
      ipAddress,
      tx,
    });

    return updated;
  });
}

