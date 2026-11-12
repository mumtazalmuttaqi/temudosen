import { prisma } from "@/lib/db/prisma";

export interface NotificationDispatchPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

/**
 * Mengirim notifikasi dengan pola reliable outbox yang terisolasi.
 * Kegagalan pengiriman notifikasi tidak pernah membatalkan transaksi booking utama.
 */
export async function dispatchNotificationsSafe(
  items: NotificationDispatchPayload[]
): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    let outboxId: string | null = null;
    try {
      const outbox = await prisma.notificationOutbox.create({
        data: {
          userId: item.userId,
          channel: "IN_APP",
          payload: {
            title: item.title,
            message: item.message,
            type: item.type,
            relatedEntityType: item.relatedEntityType ?? null,
            relatedEntityId: item.relatedEntityId ?? null,
          },
          status: "PENDING",
          attempts: 0,
        },
      });
      outboxId = outbox.id;

      await prisma.notification.create({
        data: {
          userId: item.userId,
          title: item.title,
          message: item.message,
          type: item.type,
          relatedEntityType: item.relatedEntityType ?? null,
          relatedEntityId: item.relatedEntityId ?? null,
        },
      });

      await prisma.notificationOutbox.update({
        where: { id: outbox.id },
        data: {
          status: "SENT",
          attempts: 1,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
      if (outboxId) {
        try {
          await prisma.notificationOutbox.update({
            where: { id: outboxId },
            data: {
              status: "FAILED",
              attempts: 1,
              lastError: errMsg,
            },
          });
        } catch {
          // Jangan melempar error ke caller
        }
      }
      console.error("[NotificationDispatcher] Gagal mengirim notifikasi:", errMsg);
    }
  }
}

export async function retryFailedOutboxNotifications(limit = 20): Promise<number> {
  const pending = await prisma.notificationOutbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let delivered = 0;
  for (const entry of pending) {
    try {
      const payload = entry.payload as Record<string, unknown>;
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          title: String(payload.title ?? "Notifikasi"),
          message: String(payload.message ?? ""),
          type: String(payload.type ?? "SYSTEM"),
          relatedEntityType: payload.relatedEntityType ? String(payload.relatedEntityType) : null,
          relatedEntityId: payload.relatedEntityId ? String(payload.relatedEntityId) : null,
        },
      });
      await prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: {
          status: "SENT",
          attempts: entry.attempts + 1,
          processedAt: new Date(),
          lastError: null,
        },
      });
      delivered += 1;
    } catch (error) {
      await prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: {
          status: "FAILED",
          attempts: entry.attempts + 1,
          lastError: error instanceof Error ? error.message.slice(0, 300) : "Retry error",
        },
      });
    }
  }
  return delivered;
}

