import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/http/api-response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({ status: "healthy", database: "connected" });
  } catch {
    return jsonError("Layanan basis data tidak tersedia.", 503);
  }
}

