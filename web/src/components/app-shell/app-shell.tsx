"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { PageHeaderProvider } from "./page-header-context";
import { normalizePathname } from "./route-meta";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const NO_SHELL_ROUTES = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Ngăn kéo điều hướng trên mobile (< lg)
  const [navOpen, setNavOpen] = useState(false);

  if (NO_SHELL_ROUTES.has(normalizePathname(pathname))) {
    return <>{children}</>;
  }

  return (
    <PageHeaderProvider>
      <div className="min-h-screen">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex min-h-screen min-w-0 flex-col lg:ml-60">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          <main className="flex-1 bg-bg-app p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
