"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getRouteMeta } from "./route-meta";
import { usePageHeaderActions } from "./page-header-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { getValidatedAuthSession } from "@/lib/auth-session";
import type { StoredAuthSession } from "@/store/auth";

export function Topbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<StoredAuthSession | null | undefined>(undefined);
  const { actions } = usePageHeaderActions();

  useEffect(() => {
    let active = true;
    void getValidatedAuthSession().then((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const meta = getRouteMeta(pathname);
  if (!meta || !session) return null;

  const roleLabel = session.role === "admin" ? "Quản trị viên" : "Người dùng";

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-border flex items-center px-6 gap-4">
      <div className="min-w-0 shrink-0 max-w-[180px] sm:max-w-[220px] lg:max-w-[260px]">
        <h1 className="text-lg font-semibold text-content truncate leading-tight">{meta.title}</h1>
        {meta.description ? (
          <p className="text-xs text-content-tertiary truncate">{meta.description}</p>
        ) : null}
      </div>
      <div className="hidden md:flex flex-1 min-w-0 items-center gap-2">{actions}</div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-600">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          {roleLabel}
        </span>
        <ThemeToggle />
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary transition-colors hover:bg-surface-tertiary hover:text-content"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
