"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getRouteMeta } from "./route-meta";
import { getValidatedAuthSession } from "@/lib/auth-session";
import type { StoredAuthSession } from "@/store/auth";

export function Topbar() {
  const pathname = usePathname();
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

  const meta = getRouteMeta(pathname);
  if (!meta || !session) return null;

  const roleLabel = session.role === "admin" ? "Quản trị viên" : "Người dùng";

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-border flex items-center px-6 gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold text-content truncate">{meta.title}</h1>
        {meta.description ? (
          <p className="text-xs text-content-tertiary truncate">{meta.description}</p>
        ) : null}
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-600">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
        {roleLabel}
      </span>
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary transition-colors hover:bg-surface-tertiary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
