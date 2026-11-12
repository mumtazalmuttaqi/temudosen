import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionToken, type AuthenticatedUser } from "@/lib/auth/session";
import type { LoginInput, RegisterStudentInput } from "@/lib/validations/auth";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { recordAuditLog } from "@/server/audit/audit-logger";
import { ConflictError, DomainError, ForbiddenError } from "./errors";

export async function registerStudentAccount(
  input: RegisterStudentInput,
  ipAddress?: string | null
): Promise<{ user: AuthenticatedUser; token: string }> {
  const policy = await getCampusPolicy();
  if (!policy.allowOpenStudentRegistration) {
    throw new ForbiddenError(
      "Pendaftaran mahasiswa mandiri saat ini ditutup. Silakan hubungi administrator kampus."
    );
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  if (existingEmail) {
    throw new ConflictError("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
  }

  const existingNim = await prisma.studentProfile.findUnique({
    where: { studentNumber: input.studentNumber },
    select: { id: true },
  });
  if (existingNim) {
    throw new ConflictError("NIM sudah terdaftar di sistem.");
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.$transaction(async (tx) => {
    // Role selalu dipaksa STUDENT pada endpoint registrasi publik
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            studentNumber: input.studentNumber,
            programStudy: input.programStudy,
            faculty: input.faculty,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        studentProfile: {
          select: {
            id: true,
            studentNumber: true,
            programStudy: true,
            faculty: true,
          },
        },
        lecturerProfile: {
          select: {
            id: true,
            lecturerNumber: true,
            nip: true,
            expertise: true,
            faculty: true,
            bio: true,
            avatarUrl: true,
            thesisRecommendations: true,
          },
        },
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: "AUTH_REGISTER_STUDENT",
      entityType: "User",
      entityId: user.id,
      metadata: {
        role: user.role,
        studentNumber: input.studentNumber,
      },
      ipAddress,
      tx,
    });

    return user;
  });

  const token = await signSessionToken({ userId: created.id, role: created.role });
  return { user: created, token };
}

export async function authenticateUser(
  input: LoginInput,
  ipAddress?: string | null
): Promise<{ user: AuthenticatedUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      studentProfile: {
        select: {
          id: true,
          studentNumber: true,
          programStudy: true,
          faculty: true,
        },
      },
      lecturerProfile: {
        select: {
          id: true,
          lecturerNumber: true,
          nip: true,
          expertise: true,
          faculty: true,
          bio: true,
          avatarUrl: true,
          thesisRecommendations: true,
        },
      },
    },
  });

  if (!user) {
    throw new DomainError("Email atau kata sandi tidak valid.", 401, "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new DomainError("Email atau kata sandi tidak valid.", 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new ForbiddenError(
      "Akun Anda saat ini berstatus nonaktif atau ditangguhkan. Hubungi administrator."
    );
  }

  await recordAuditLog({
    actorUserId: user.id,
    action: "AUTH_LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role },
    ipAddress,
  });

  const token = await signSessionToken({ userId: user.id, role: user.role });

  const safeUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    studentProfile: user.studentProfile,
    lecturerProfile: user.lecturerProfile,
  };

  return { user: safeUser, token };
}

