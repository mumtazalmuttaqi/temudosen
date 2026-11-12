import { verifyCsrfOrigin } from "@/lib/auth/csrf";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/rate-limit";
import { handleApiError, jsonError, jsonOk } from "@/lib/http/api-response";
import { recordAuditLog } from "@/server/audit/audit-logger";

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return jsonError("Origin permintaan tidak diizinkan.", 403);
    }

    const user = await getCurrentUser();
    await clearSessionCookie();

    if (user) {
      await recordAuditLog({
        actorUserId: user.id,
        action: "AUTH_LOGOUT",
        entityType: "User",
        entityId: user.id,
        ipAddress: getClientIp(request),
      });
    }

    return jsonOk({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}

