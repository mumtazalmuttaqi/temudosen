import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSessionSecret } from "@/lib/env";

export const SESSION_COOKIE_NAME = "temudosen_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export interface SessionJwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  studentProfile: {
    id: string;
    studentNumber: string;
    programStudy: string;
    faculty: string;
  } | null;
  lecturerProfile: {
    id: string;
    lecturerNumber: string;
    nip: string | null;
    expertise: string;
    faculty: string;
    bio: string | null;
    avatarUrl: string | null;
    thesisRecommendations: string[];
  } | null;
}

export async function signSessionToken(payload: SessionJwtPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const userId = payload.sub;
    const role = payload.role;
    if (
      typeof userId !== "string" ||
      (role !== "STUDENT" && role !== "LECTURER" && role !== "ADMIN")
    ) {
      return null;
    }
    return { userId, role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
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

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
});

