import { getCurrentUser } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http/api-response";
import { getCampusPolicy } from "@/server/policies/settings-service";

export async function GET() {
  const [user, policy] = await Promise.all([getCurrentUser(), getCampusPolicy()]);
  return jsonOk({
    user,
    campusTimezone: policy.campusTimezone,
    allowOpenStudentRegistration: policy.allowOpenStudentRegistration,
  });
}

