import type { UserRole } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { getCurrentUser, type AuthenticatedUser } from "@/lib/auth/session";
import { verifyCsrfOrigin } from "@/lib/auth/csrf";
export { getDefaultHomeForRole } from "@/lib/utils";

export async function requirePageUser(allowedRoles?: UserRole[]): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    forbidden();
  }
  return user;
}

export type ApiAuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; status: 401 | 403; error: string };

export async function requireApiUser(
  request: Request,
  allowedRoles?: UserRole[]
): Promise<ApiAuthResult> {
  if (!verifyCsrfOrigin(request)) {
    return {
      ok: false,
      status: 403,
      error: "Origin permintaan tidak diizinkan.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Sesi tidak valid atau telah berakhir. Silakan masuk kembali.",
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      status: 403,
      error: "Anda tidak memiliki kewenangan untuk mengakses sumber daya ini.",
    };
  }

  return { ok: true, user };
}
