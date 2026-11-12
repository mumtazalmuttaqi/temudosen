import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "privateNotes",
  "private_notes",
  "cookie",
]);

function sanitizeMetadata(input: Record<string, unknown>): Prisma.InputJsonValue {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = "[REDACTED]";
    } else if (value instanceof Date) {
      clean[key] = value.toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean as Prisma.InputJsonValue;
}

export interface AuditLogParams {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  tx?: Prisma.TransactionClient;
}

export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  const db = params.tx ?? prisma;
  await db.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: sanitizeMetadata(params.metadata ?? {}),
      ipAddress: params.ipAddress ?? null,
    },
  });
}

