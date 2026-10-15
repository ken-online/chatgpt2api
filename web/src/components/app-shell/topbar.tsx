"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { getRouteMeta } from "./route-meta";
import { usePageHeaderActions } from "./page-header-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { VersionReleaseDialog } from "@/components/version-release-dialog";
import { getValidatedAuthSession } from "@/lib/auth-session";
import type { StoredAuthSession } from "@/store/auth";

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
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

  const roleLabel = session.role === "admin" ? "Admin" : "User";

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-border flex items-center px-3 gap-2 sm:px-6 sm:gap-4">
      <button
        type="button"
        onClick={onOpenNav}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1 sm:flex-none sm:max-w-[220px] sm:shrink-0 lg:max-w-[260px]">
        <h1 className="text-base sm:text-lg font-semibold text-content truncate leading-tight">{meta.title}</h1>
        {meta.description ? (
          <p className="hidden sm:block text-xs text-content-tertiary truncate">{meta.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:min-w-0 sm:flex-1 sm:shrink">{actions}</div>
      <div className="ml-auto flex items-center gap-1 shrink-0 sm:gap-2">
        <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-600">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          {roleLabel}
        </span>
        <ThemeToggle />
        <VersionReleaseDialog />
        <button
          type="button"
          className="relative hidden h-9 w-9 items-center sm:flex justify-center rounded-lg bg-surface-secondary text-content-secondary transition-colors hover:bg-surface-tertiary hover:text-content"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
