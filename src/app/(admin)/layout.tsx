import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageShellSkeleton } from "@/components/shared/loading-skeleton";
import { requirePageUser } from "@/lib/permissions/rbac";

async function AdminShellGuard({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(["ADMIN"]);

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      initialUnreadCount={0}
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <AdminShellGuard>{children}</AdminShellGuard>
    </Suspense>
  );
}

