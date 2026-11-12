import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageShellSkeleton } from "@/components/shared/loading-skeleton";
import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/permissions/rbac";

async function StudentShellGuard({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(["STUDENT"]);
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      initialUnreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <StudentShellGuard>{children}</StudentShellGuard>
    </Suspense>
  );
}

