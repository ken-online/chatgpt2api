"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const NO_SHELL_ROUTES = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_SHELL_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-60 flex min-h-screen flex-col">
        <Topbar />
        <main className="flex-1 p-6 bg-bg-app">{children}</main>
      </div>
    </div>
  );
}
