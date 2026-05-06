"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_META, SIDEBAR_ORDER } from "./route-meta";
import { getValidatedAuthSession } from "@/lib/auth-session";
import { clearStoredAuthSession, type StoredAuthSession } from "@/store/auth";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void getValidatedAuthSession().then((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (!session) return null;

  const isAdmin = session.role === "admin";
  const items = SIDEBAR_ORDER.map((path) => ({ path, meta: ROUTE_META[path] })).filter(
    ({ meta }) => meta && meta.adminSidebar && (isAdmin || meta.userAccessible),
  );

  const displayName = session.name?.trim() || (isAdmin ? "Quản trị viên" : "Người dùng");
  const initial = (displayName[0] || "?").toUpperCase();
  const subjectId = session.subjectId?.trim() || "local";

  const handleLogout = async () => {
    await clearStoredAuthSession();
    router.replace("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-surface flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <span className="text-[19px] font-bold tracking-tight bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">
          ChatGPT
        </span>
        <span className="ml-0.5 text-[19px] font-light text-content-tertiary">2API</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map(({ path, meta }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary-500/10 text-primary-600"
                  : "text-content-secondary hover:bg-surface-secondary hover:text-content",
              )}
            >
              {meta.title}
              {active ? <span className="nav-active-dot" /> : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-secondary p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white shadow-md">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-content">{displayName}</div>
            <div className="truncate text-xs text-content-tertiary">{subjectId}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-content-secondary transition-all duration-200 hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
