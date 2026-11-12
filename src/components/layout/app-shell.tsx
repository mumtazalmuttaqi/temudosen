"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ROLE_LABELS, cn, getInitials } from "@/lib/utils";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Cari Dosen", href: "/student/lecturers", icon: GraduationCap },
    { label: "Jadwal Konsultasi", href: "/student/book", icon: CalendarCheck },
    { label: "Booking Saya", href: "/student/bookings", icon: ClipboardList },
    { label: "Riwayat Bimbingan", href: "/student/history", icon: History },
    { label: "Notifikasi", href: "/student/notifications", icon: Bell },
    { label: "Profil dan Pengaturan", href: "/student/profile", icon: UserIcon },
  ],
  LECTURER: [
    { label: "Dashboard", href: "/lecturer/dashboard", icon: LayoutDashboard },
    { label: "Kalender / Jadwal", href: "/lecturer/calendar", icon: Calendar },
    { label: "Ketersediaan Saya", href: "/lecturer/availabilities", icon: Clock },
    { label: "Permintaan Booking", href: "/lecturer/requests", icon: ClipboardList },
    { label: "Konsultasi Mendatang", href: "/lecturer/upcoming", icon: CalendarClock },
    { label: "Riwayat Mahasiswa", href: "/lecturer/history", icon: History },
    { label: "Notifikasi", href: "/lecturer/notifications", icon: Bell },
    { label: "Profil", href: "/lecturer/profile", icon: UserIcon },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Pengguna", href: "/admin/users", icon: Users },
    { label: "Dosen", href: "/admin/lecturers", icon: GraduationCap },
    { label: "Mahasiswa", href: "/admin/students", icon: BookOpen },
    { label: "Layanan Konsultasi", href: "/admin/services", icon: FileText },
    { label: "Booking", href: "/admin/bookings", icon: ClipboardList },
    { label: "Laporan", href: "/admin/reports", icon: BarChart3 },
    { label: "Audit Log", href: "/admin/audit-logs", icon: ShieldCheck },
    { label: "Pengaturan Sistem", href: "/admin/settings", icon: Settings },
  ],
};

function getPageTitle(pathname: string, navItems: NavItem[]): string {
  const matched = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  if (matched) return matched.label;
  if (pathname.includes("/bookings/")) return "Detail Booking";
  if (pathname.includes("/lecturers/")) return "Profil & Jadwal Dosen";
  return "Dashboard";
}

export function AppShell({
  user,
  initialUnreadCount = 0,
  children,
}: {
  user: ShellUser;
  initialUnreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fetchedUnread, setFetchedUnread] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const unreadCount = fetchedUnread ?? initialUnreadCount;
  const navItems = useMemo(() => NAV_BY_ROLE[user.role], [user.role]);
  const pageTitle = useMemo(() => getPageTitle(pathname, navItems), [pathname, navItems]);

  const notificationsHref =
    user.role === "STUDENT"
      ? "/student/notifications"
      : user.role === "LECTURER"
        ? "/lecturer/notifications"
        : "/admin/audit-logs";

  const profileHref =
    user.role === "STUDENT"
      ? "/student/profile"
      : user.role === "LECTURER"
        ? "/lecturer/profile"
        : "/admin/settings";

  useEffect(() => {
    let cancelled = false;
    async function syncUnread() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.ok && typeof json.data?.unreadCount === "number") {
          setFetchedUnread(json.data.unreadCount);
        }
      } catch {
        // ignore transient network errors
      }
    }
    void syncUnread();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Anda telah keluar dari sistem.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f2942] text-slate-100">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href={navItems[0].href} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold">
            TD
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight text-white">TemuDosen</span>
            <span className="block text-[11px] text-blue-200/80">Konsultasi Akademik</span>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 lg:hidden cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Navigasi utama">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/90 text-white shadow-xs"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.href.endsWith("/notifications") && unreadCount > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs font-medium text-blue-200">{USER_ROLE_LABELS[user.role]}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-300">{user.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user.role !== "ADMIN" ? (
              <Link
                href={notificationsHref}
                aria-label="Notifikasi"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Menu profil ${user.name}`}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#143359] text-xs font-semibold text-white">
                    {getInitials(user.name)}
                  </span>
                  <span className="hidden sm:block text-sm font-medium text-slate-800 max-w-[140px] truncate">
                    {user.name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <p className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-800">
                    {USER_ROLE_LABELS[user.role]}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    {user.role === "ADMIN" ? "Pengaturan Sistem" : "Profil Saya"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Keluar..." : "Keluar"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
