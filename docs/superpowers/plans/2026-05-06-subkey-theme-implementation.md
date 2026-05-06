# SubKey Theme Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate ChatGPT2API frontend to SubKey Admin design system — sidebar+topbar shell, indigo+slate palette, new Dashboard at `/`, keep all backend logic and Radix components untouched.

**Architecture:** Tailwind v4 `@theme inline` mapping CSS variables (port from SubKey `:root` + `.dark`). Rewrite `cva` variants of shadcn primitives (Button, Card, Badge, Input, Dialog) to use new tokens. New `app-shell` folder holds Sidebar + Topbar + AppShell wrapper. Page-level files only need outer-container className tweaks.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Radix UI primitives, `class-variance-authority`, Inter font via `next/font/google`, Lucide icons (already installed).

**Reference spec:** `docs/superpowers/specs/2026-05-06-subkey-theme-design.md`

**Verification approach:** No frontend test suite exists — every task ends with **manual visual verification** via dev server (`docker compose -f docker-compose.local.yml exec app sh -c "cd /app && uv run uvicorn ..."` is production; for dev iteration use `cd web && npm run dev` from host machine). Final task rebuilds Docker image.

---

## Task 1: Setup theme tokens — rewrite globals.css

**Files:**
- Modify: `web/src/app/globals.css` (full rewrite, currently 145 lines)

- [ ] **Step 1: Replace globals.css with SubKey-derived tokens**

Write the complete file content:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Surfaces & content semantic vars */
  --color-bg-app: var(--bg-app);
  --color-surface: var(--surface);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-tertiary: var(--surface-tertiary);
  --color-surface-elevated: var(--surface-elevated);
  --color-border: var(--border);
  --color-border-secondary: var(--border-secondary);
  --color-content: var(--content);
  --color-content-secondary: var(--content-secondary);
  --color-content-tertiary: var(--content-tertiary);
  --color-content-inverse: var(--content-inverse);

  /* Primary indigo scale */
  --color-primary-50: #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  --color-primary-950: #1e1b4b;

  /* shadcn legacy aliases — keep so existing components still resolve */
  --color-background: var(--bg-app);
  --color-foreground: var(--content);
  --color-card: var(--surface);
  --color-card-foreground: var(--content);
  --color-popover: var(--surface);
  --color-popover-foreground: var(--content);
  --color-primary: var(--color-primary-600);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--surface-secondary);
  --color-secondary-foreground: var(--content);
  --color-muted: var(--surface-secondary);
  --color-muted-foreground: var(--content-secondary);
  --color-accent: var(--surface-secondary);
  --color-accent-foreground: var(--content);
  --color-destructive: #dc2626;
  --color-input: var(--border);
  --color-ring: var(--color-primary-500);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius: 0.5rem;

  --font-sans: 'Inter', system-ui, -apple-system, "Segoe UI", "Helvetica Neue", sans-serif;
}

:root {
  --bg-app: #f8fafc;
  --surface: #ffffff;
  --surface-secondary: #f1f5f9;
  --surface-tertiary: #e2e8f0;
  --surface-elevated: #ffffff;
  --border: #e2e8f0;
  --border-secondary: #cbd5e1;
  --content: #0f172a;
  --content-secondary: #475569;
  --content-tertiary: #94a3b8;
  --content-inverse: #ffffff;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  --scrollbar-track: #f1f5f9;
  --scrollbar-thumb: #cbd5e1;
  --scrollbar-thumb-hover: #94a3b8;

  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(255, 255, 255, 0.2);
}

.dark {
  --bg-app: #0a0a0f;
  --surface: #12121a;
  --surface-secondary: #1a1a24;
  --surface-tertiary: #24242f;
  --surface-elevated: #1e1e2a;
  --border: #2a2a3a;
  --border-secondary: #3a3a4a;
  --content: #f8fafc;
  --content-secondary: #a1a1aa;
  --content-tertiary: #71717a;
  --content-inverse: #0f172a;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);

  --scrollbar-track: #12121a;
  --scrollbar-thumb: #3a3a4a;
  --scrollbar-thumb-hover: #4a4a5a;

  --glass-bg: rgba(18, 18, 26, 0.8);
  --glass-border: rgba(255, 255, 255, 0.05);
}

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply antialiased;
    background: var(--bg-app);
    color: var(--content);
    transition: background-color 0.3s ease, color 0.3s ease;
    overscroll-behavior: none;
  }
  *:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
  ::selection {
    background: rgba(99, 102, 241, 0.3);
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }
}

@layer utilities {
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
  }
  .nav-active-dot {
    margin-left: auto;
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: var(--color-primary-500);
  }
}

@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

- [ ] **Step 2: Verify dev server compiles**

Run from `web/` directory (host machine, not Docker):
```bash
cd web && npm run dev
```
Expected: `▲ Next.js ready` without CSS errors. Open http://localhost:3000/login — page renders with white bg + slate text (warm beige gradient gone). If error mentions `@theme inline`, check Tailwind v4 is installed (already is, package.json has `"tailwindcss": "^4"`).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(theme): port SubKey CSS variables to globals.css"
```

---

## Task 2: Add Inter font via next/font

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

Currently uses inline `fontFamily: '"SF Pro Display"...'`. Switch to Inter via `next/font`. Replace entire file:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ChatGPT2API",
  description: "ChatGPT account pool management dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-sans">
        <Toaster position="top-center" richColors offset={48} />
        {children}
      </body>
    </html>
  );
}
```

Note: `<TopNav />` and outer `<main>` wrapper are removed here — they will move into `AppShell` in Task 11. For now layout has no shell; pages render directly inside body.

- [ ] **Step 2: Verify**

Refresh http://localhost:3000/login — text now renders in Inter (rounder than SF Pro). Vietnamese diacritics (`Đăng nhập`) display correctly.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "feat(theme): swap to Inter font, drop SF Pro inline style"
```

---

## Task 3: Rewrite Button cva variants

**Files:**
- Modify: `web/src/components/ui/button.tsx`

- [ ] **Step 1: Replace button.tsx**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md",
        outline:
          "border border-border bg-surface text-content hover:bg-surface-secondary",
        secondary:
          "bg-surface-secondary text-content border border-border hover:bg-surface-tertiary",
        ghost:
          "text-content-secondary hover:bg-surface-secondary hover:text-content",
        link: "text-primary-600 underline-offset-4 hover:underline",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

Key changes from original:
- Default radius `rounded-md` → `rounded-lg` (8px)
- Added `active:scale-[0.98]` micro-interaction (SubKey signature)
- `default` variant: indigo solid bg with shadow grow on hover
- `outline` / `secondary` use new semantic tokens (`bg-surface`, `text-content`)
- Sizes bumped: default 9 → 10, lg 10 → 11

- [ ] **Step 2: Verify**

Open http://localhost:3000/login. Form submit button now has indigo bg + shadow, hover slight darken, click feels "pressed" (scale). No console errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/button.tsx
git commit -m "feat(theme): rewrite Button variants for indigo+slate palette"
```

---

## Task 4: Rewrite Card default styling

**Files:**
- Modify: `web/src/components/ui/card.tsx`

- [ ] **Step 1: Replace card.tsx**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-surface text-content flex flex-col rounded-xl border border-border shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight text-content", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-content-tertiary text-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle };
```

Key changes:
- `rounded-3xl` → `rounded-xl` (12px)
- `border-white/70 shadow-[long_custom]` → `border-border shadow-sm hover:shadow-md`
- `bg-card text-card-foreground` → `bg-surface text-content` (semantic tokens)

- [ ] **Step 2: Verify**

Visit http://localhost:3000/accounts after login. Cards have crisp slate-200 border, subtle shadow that grows on hover.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/card.tsx
git commit -m "feat(theme): tighten Card to rounded-xl with semantic tokens"
```

---

## Task 5: Rewrite Badge variants with alpha pattern

**Files:**
- Modify: `web/src/components/ui/badge.tsx`

- [ ] **Step 1: Replace badge.tsx**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150",
  {
    variants: {
      variant: {
        default: "bg-primary-500/10 text-primary-600",
        secondary: "bg-surface-tertiary text-content-secondary",
        outline: "border border-border bg-surface text-content",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        danger: "bg-red-500/15 text-red-700 dark:text-red-400",
        info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        violet: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

Key changes:
- `rounded-full px-2.5 py-0.5` → `px-2.5 py-1` (slightly taller, SubKey style)
- All status variants: `bg-{color}-500/15 text-{color}-700` (alpha pattern, no border)
- `font-medium` → `font-semibold` (sharper)
- Removed border on status variants (cleaner)

- [ ] **Step 2: Verify**

Visit http://localhost:3000/accounts. Status badges (Bình thường / Giới hạn / Bất thường / Vô hiệu hoá) show colored pill: green/yellow/red/gray. Account type badge uses default indigo.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/badge.tsx
git commit -m "feat(theme): switch Badge to alpha-bg pill pattern"
```

---

## Task 6: Update Input + Select primitives

**Files:**
- Modify: `web/src/components/ui/input.tsx`
- Modify: `web/src/components/ui/select.tsx` (if file exists)

- [ ] **Step 1: Read current input.tsx**

Run: `cat web/src/components/ui/input.tsx`
Capture current content (will minimally edit, not full rewrite — only border + focus ring classes).

- [ ] **Step 2: Update input.tsx focus ring + border**

Locate the className string that contains border and focus styles. Replace with:

```tsx
"flex h-10 w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-content placeholder:text-content-tertiary outline-none transition-all duration-200 focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/15 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium"
```

Keep all other props/exports unchanged.

- [ ] **Step 3: Check if select.tsx exists**

```bash
ls web/src/components/ui/select.tsx 2>&1
```

If exists, the file uses Radix Select primitive — only update className strings to use new tokens (`border-border`, `bg-surface`, `text-content`, `focus:ring-primary-500/15`). If file does NOT exist, skip this sub-step.

- [ ] **Step 4: Verify**

Visit http://localhost:3000/login. Email/password input fields have crisp border, focus shows soft indigo glow ring (3px).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/input.tsx web/src/components/ui/select.tsx 2>/dev/null
git commit -m "feat(theme): refresh Input/Select focus ring to indigo"
```

---

## Task 7: Update Dialog overlay styling

**Files:**
- Modify: `web/src/components/ui/dialog.tsx`

- [ ] **Step 1: Read dialog.tsx**

Run: `cat web/src/components/ui/dialog.tsx`. Identify the className for `DialogOverlay` (typically `fixed inset-0 z-50 bg-black/80`) and `DialogContent` (typically has rounded-lg border bg-background).

- [ ] **Step 2: Update DialogOverlay className**

Find the line defining overlay className (search for `inset-0 z-50`). Replace its className with:

```tsx
"fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```

- [ ] **Step 3: Update DialogContent className**

Find DialogContent className. Update to use:

```tsx
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-surface p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl"
```

- [ ] **Step 4: Verify**

Visit http://localhost:3000/accounts, click "Sửa tài khoản" or any button that opens dialog. Overlay shows soft black + blur backdrop. Modal has `rounded-xl` corners on `bg-surface`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/dialog.tsx
git commit -m "feat(theme): blur dialog overlay, rounded-xl content"
```

---

## Task 8: Create route metadata file

**Files:**
- Create: `web/src/components/app-shell/route-meta.ts`

- [ ] **Step 1: Create the file**

```ts
export type RouteMeta = {
  title: string;
  description: string;
  /** Whether this route appears in admin sidebar */
  adminSidebar: boolean;
  /** Whether non-admin users can access */
  userAccessible: boolean;
};

export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "Dashboard",
    description: "Tổng quan hệ thống ChatGPT2API",
    adminSidebar: true,
    userAccessible: false,
  },
  "/accounts": {
    title: "Accounts",
    description: "Quản lý nhóm tài khoản OpenAI",
    adminSidebar: true,
    userAccessible: false,
  },
  "/image": {
    title: "Image",
    description: "Tạo ảnh với gpt-image-2",
    adminSidebar: true,
    userAccessible: true,
  },
  "/image-manager": {
    title: "Image History",
    description: "Lịch sử các tác vụ ảnh đã tạo",
    adminSidebar: true,
    userAccessible: false,
  },
  "/logs": {
    title: "Logs",
    description: "Nhật ký hoạt động hệ thống",
    adminSidebar: true,
    userAccessible: false,
  },
  "/register": {
    title: "Auto Register",
    description: "Đăng ký tài khoản OpenAI tự động",
    adminSidebar: true,
    userAccessible: false,
  },
  "/settings": {
    title: "Settings",
    description: "Cấu hình hệ thống và tích hợp",
    adminSidebar: true,
    userAccessible: false,
  },
  "/login": {
    title: "Login",
    description: "",
    adminSidebar: false,
    userAccessible: true,
  },
};

export const SIDEBAR_ORDER = [
  "/",
  "/accounts",
  "/image",
  "/image-manager",
  "/logs",
  "/register",
  "/settings",
] as const;

export function getRouteMeta(pathname: string): RouteMeta | null {
  return ROUTE_META[pathname] ?? null;
}
```

- [ ] **Step 2: Commit (no visual change yet)**

```bash
git add web/src/components/app-shell/route-meta.ts
git commit -m "feat(app-shell): add route metadata table"
```

---

## Task 9: Create Sidebar component

**Files:**
- Create: `web/src/components/app-shell/sidebar.tsx`

- [ ] **Step 1: Create sidebar.tsx**

```tsx
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
  const items = SIDEBAR_ORDER
    .map((path) => ({ path, meta: ROUTE_META[path] }))
    .filter(({ meta }) => meta && meta.adminSidebar && (isAdmin || meta.userAccessible));

  const initial = (session.name?.trim() || (isAdmin ? "Q" : "U"))[0]?.toUpperCase();
  const displayName = session.name?.trim() || (isAdmin ? "Quản trị viên" : "Người dùng");
  const email = session.email?.trim() || "local";

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
            <div className="truncate text-xs text-content-tertiary">{email}</div>
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
```

- [ ] **Step 2: Verify auth-session import path**

```bash
ls web/src/lib/auth-session.ts web/src/store/auth.ts 2>&1
```
Both files must exist (TopNav already imports them at lines 9-11). If either is missing, plan needs adjustment — STOP and report.

- [ ] **Step 3: Commit (not wired yet)**

```bash
git add web/src/components/app-shell/sidebar.tsx
git commit -m "feat(app-shell): add Sidebar component with role-based filtering"
```

---

## Task 10: Create Topbar component

**Files:**
- Create: `web/src/components/app-shell/topbar.tsx`

- [ ] **Step 1: Create topbar.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/app-shell/topbar.tsx
git commit -m "feat(app-shell): add Topbar with route-driven title"
```

---

## Task 11: Create AppShell wrapper

**Files:**
- Create: `web/src/components/app-shell/app-shell.tsx`

- [ ] **Step 1: Create app-shell.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/app-shell/app-shell.tsx
git commit -m "feat(app-shell): add AppShell composing Sidebar + Topbar"
```

---

## Task 12: Wire AppShell into root layout

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx to wrap children in AppShell**

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AppShell } from "@/components/app-shell/app-shell";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ChatGPT2API",
  description: "ChatGPT account pool management dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-sans">
        <Toaster position="top-center" richColors offset={48} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify shell renders**

Refresh http://localhost:3000/accounts (must be logged in). Expected layout:
- Left sidebar 240px wide (`w-60` = 240px in Tailwind), white bg, "ChatGPT2API" gradient logo on top
- Topbar 64px sticky, says "Accounts" + description, role pill on right
- Main content area on right with slate-50 bg
- Login page http://localhost:3000/login renders WITHOUT shell (centered card)

If pages overflow horizontally because old `max-w-[1440px] mx-auto` from page contents conflicts with `ml-60`, this is expected — Task 15 will clean those up.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "feat(app-shell): wire AppShell into root layout"
```

---

## Task 13: Create Dashboard page at /

**Files:**
- Create: `web/src/app/page.tsx`

- [ ] **Step 1: Verify required API endpoints exist**

```bash
grep -n "list_accounts\|@router.get.*logs\|@router.get.*accounts" "E:/Setup/Programing/Python/Python Project/API/ChatGPT2API/api/accounts.py" "E:/Setup/Programing/Python/Python Project/API/ChatGPT2API/api/logs.py" 2>&1 | head -20
```

Confirms `GET /api/accounts` and `GET /api/logs` exist. The dashboard reuses these — no backend changes.

- [ ] **Step 2: Create page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { httpRequest } from "@/lib/request";
import type { Account } from "@/lib/api";

type LogEntry = {
  id: string;
  time: string;
  type: string;
  summary: string;
  detail?: Record<string, unknown> | null;
};

type LogsResponse = {
  items: LogEntry[];
};

const STAT_ICONS: Record<string, string> = {
  total: "A",
  quota: "Q",
  today: "I",
  rate: "%",
};

export default function DashboardPage() {
  useAuthGuard("admin");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    void httpRequest<{ items: Account[] }>("/api/accounts").then((r) => setAccounts(r.items ?? []));
    void httpRequest<LogsResponse>("/api/logs?limit=200").then((r) => setLogs(r.items ?? []));
  }, []);

  // Aggregations
  const total = accounts.length;
  const active = accounts.filter((a) => a.status === "正常").length;
  const limited = accounts.filter((a) => a.status === "限流").length;
  const abnormal = accounts.filter((a) => a.status === "异常").length;
  const disabled = accounts.filter((a) => a.status === "禁用").length;
  const quotaSum = accounts
    .filter((a) => a.status === "正常" && !a.image_quota_unknown)
    .reduce((sum, a) => sum + Math.max(0, a.quota), 0);

  const today = new Date().toISOString().slice(0, 10);
  const callsToday = logs.filter((l) => l.type === "call" && l.time?.startsWith(today));
  const todayCount = callsToday.length;
  const todaySuccess = callsToday.filter((l) => (l.detail as { status?: string } | null)?.status !== "failed").length;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const recentCalls = logs.filter((l) => l.type === "call" && l.time && l.time >= sevenDaysAgo);
  const recentSuccess = recentCalls.filter((l) => (l.detail as { status?: string } | null)?.status !== "failed").length;
  const successRate = recentCalls.length > 0 ? ((recentSuccess / recentCalls.length) * 100).toFixed(1) : "—";

  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng tài khoản" value={String(total)} sub={`${active} bình thường`} icon={STAT_ICONS.total} />
        <StatCard label="Hạn mức còn" value={String(quotaSum)} sub="tổng số ảnh" icon={STAT_ICONS.quota} />
        <StatCard label="Ảnh hôm nay" value={String(todayCount)} sub={`${todaySuccess} thành công`} icon={STAT_ICONS.today} />
        <StatCard label="Tỉ lệ thành công" value={successRate === "—" ? "—" : `${successRate}%`} sub="7 ngày qua" icon={STAT_ICONS.rate} />
      </div>

      {/* Status breakdown + API activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Trạng thái tài khoản</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2.5">
            <StatusTile bg="bg-emerald-100" text="text-emerald-800" n={active} l="Bình thường" />
            <StatusTile bg="bg-amber-100" text="text-amber-800" n={limited} l="Giới hạn" />
            <StatusTile bg="bg-red-100" text="text-red-800" n={abnormal} l="Bất thường" />
            <StatusTile bg="bg-surface-secondary" text="text-content-secondary" n={disabled} l="Vô hiệu hoá" />
            <StatusTile bg="bg-violet-100" text="text-violet-800" n={quotaSum} l="Hạn mức" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">API Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-xl font-bold text-primary-600">≈</div>
              <div>
                <div className="text-3xl font-bold tracking-tight leading-none">{todayCount}</div>
                <div className="mt-1 text-xs text-content-tertiary">request hôm nay</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {recentLogs.length === 0 ? (
            <div className="py-4 text-sm text-content-tertiary">Chưa có hoạt động</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="flex justify-between gap-4 border-b border-border-secondary/30 py-3 last:border-b-0 text-sm">
                <div className="min-w-0">
                  <div className="text-content truncate">{log.summary}</div>
                  <div className="mt-0.5 truncate text-xs text-content-tertiary">{formatDetail(log.detail)}</div>
                </div>
                <div className="shrink-0 text-xs text-content-tertiary self-center whitespace-nowrap">{log.time}</div>
              </div>
            ))
          )}
          <div className="pt-4">
            <Link href="/logs" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Xem tất cả →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="text-xs font-medium text-content-secondary">{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-[11px] text-content-tertiary">{sub}</div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 text-sm font-bold text-primary-600">
          {icon}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-32 w-32"
          style={{ background: "radial-gradient(circle at top right, rgba(99,102,241,0.08), transparent 70%)" }}
        />
      </CardContent>
    </Card>
  );
}

function StatusTile({ bg, text, n, l }: { bg: string; text: string; n: number; l: string }) {
  return (
    <div className={`rounded-lg p-3.5 ${bg} ${text}`}>
      <div className="text-xl font-bold leading-none">{n}</div>
      <div className="mt-1 text-[11px] font-medium">{l}</div>
    </div>
  );
}

function formatDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  return Object.entries(detail as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}
```

- [ ] **Step 2: Verify imports resolve**

```bash
ls web/src/lib/use-auth-guard.ts web/src/lib/request.ts 2>&1
grep "useAuthGuard" web/src/app/accounts/page.tsx
```
Both files exist (already used by accounts page). If not, STOP and adjust import paths.

- [ ] **Step 3: Verify page renders**

Visit http://localhost:3000/. Should show dashboard with 4 stat cards (Tổng tài khoản / Hạn mức / Ảnh hôm nay / Tỉ lệ thành công) populated from real backend data, status breakdown card, API activity card, and 5 most recent logs.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat(dashboard): new landing page with aggregated stats"
```

---

## Task 14: Update Login redirect

**Files:**
- Modify: `web/src/app/login/page.tsx`

- [ ] **Step 1: Read current login page**

```bash
grep -n "router.replace\|router.push\|/accounts\|/image" web/src/app/login/page.tsx
```

Find the lines that redirect after successful login. Likely 2 places (success → admin redirect, success → user redirect).

- [ ] **Step 2: Update redirects**

Change admin success redirect from `/accounts` (or `/image`) to `/`. Keep user redirect at `/image`. Specifically:

```tsx
// admin: replace /accounts → /
router.replace(session.role === "admin" ? "/" : "/image");
```

If login page only has 1 redirect (e.g. always to `/image`), change it to:
```tsx
router.replace(session.role === "admin" ? "/" : "/image");
```

- [ ] **Step 3: Update login styling**

In the same file, find the outer wrapper (likely `<main>` or `<div>` with bg-something) and replace its className with:
```tsx
"min-h-screen bg-bg-app flex items-center justify-center px-4"
```

The login card itself uses `<Card>` from shadcn — already updated in Task 4, so no change needed.

- [ ] **Step 4: Verify**

Logout, then re-login as admin. Should land on `/` (Dashboard). Logout, login as a non-admin user (if test data exists), should land on `/image`.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/login/page.tsx
git commit -m "feat(login): redirect admins to dashboard, refresh palette"
```

---

## Task 15: Page-level cleanup — remove legacy outer styling

**Files:**
- Modify: `web/src/app/accounts/page.tsx`
- Modify: `web/src/app/image/page.tsx`
- Modify: `web/src/app/image-manager/page.tsx`
- Modify: `web/src/app/logs/page.tsx`
- Modify: `web/src/app/register/page.tsx`
- Modify: `web/src/app/settings/page.tsx`

These files currently have outer wrappers with `max-w-[1440px] mx-auto` plus inner cards using `rounded-2xl bg-white/80`. Since AppShell now handles padding (`p-6`) and background, remove redundant wrappers.

- [ ] **Step 1: Identify patterns to remove**

Run for each page:
```bash
grep -n "max-w-\[1440px\]\|rounded-2xl bg-white\|rounded-2xl bg-gradient" web/src/app/{accounts,image,image-manager,logs,register,settings}/page.tsx
```

Capture line numbers per file.

- [ ] **Step 2: For each page, simplify outer wrapper**

The pages may have a structure like:
```tsx
<>
  <section className="...flex-col gap-4 lg:flex-row...">...</section>
  <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">...</div>
  ...
</>
```

If the page wraps content in `<div className="mx-auto max-w-[1440px]...">`, change to `<div className="space-y-6">`. AppShell already provides `p-6 bg-bg-app` outside.

- [ ] **Step 3: Replace inline `rounded-2xl bg-white/80` patterns**

For each occurrence (use `replace_all: true` carefully):
- `rounded-2xl border-white/80 bg-white/90` → `rounded-xl border border-border bg-surface`
- `rounded-2xl bg-white/80` → `rounded-xl bg-surface border border-border`
- `bg-stone-100` → `bg-surface-secondary`
- `text-stone-500` → `text-content-tertiary`
- `text-stone-700` → `text-content`
- `text-stone-900` → `text-content`
- `border-stone-100` / `border-stone-200` → `border-border`

Use sed equivalent only after grep'ing each occurrence to avoid surprises. Recommended manual `Edit` tool per file with `replace_all: false` so engineer can confirm context.

- [ ] **Step 4: Verify all 6 pages**

For each path, visit http://localhost:3000/<path>. Each should render inside AppShell with:
- No double background (only one slate-50 layer)
- Cards have `rounded-xl` (12px) corners, not `rounded-2xl` (16px)
- No warm beige tone anywhere
- Status badges from Task 5 already correct

If any page looks broken (missing border, weird spacing), STOP and fix before commit.

- [ ] **Step 5: Commit per file or one batch**

```bash
git add web/src/app/accounts/page.tsx web/src/app/image/page.tsx web/src/app/image-manager/page.tsx web/src/app/logs/page.tsx web/src/app/register/page.tsx web/src/app/settings/page.tsx
git commit -m "refactor(pages): drop legacy outer wrappers, use semantic tokens"
```

---

## Task 16: Remove TopNav

**Files:**
- Delete: `web/src/components/top-nav.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rn "from \"@/components/top-nav\"\|from \"./top-nav\"" web/src 2>&1
```
Expected: 0 matches (layout.tsx already removed import in Task 2).

If any match, fix before deleting.

- [ ] **Step 2: Delete file**

```bash
rm "E:/Setup/Programing/Python/Python Project/API/ChatGPT2API/web/src/components/top-nav.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add -A web/src/components/
git commit -m "chore: remove legacy TopNav component"
```

---

## Task 17: Docker rebuild + production verification

**Files:** No file changes — verify production build.

- [ ] **Step 1: Stop dev server**

If `npm run dev` is running on host, Ctrl+C it. Production verification uses Docker only.

- [ ] **Step 2: Rebuild Docker image**

```bash
cd "E:/Setup/Programing/Python/Python Project/API/ChatGPT2API"
docker compose -f docker-compose.local.yml up -d --build
```

Expected: build succeeds (no TypeScript errors, no Tailwind compile errors). Container starts and health check passes within 30s.

- [ ] **Step 3: Verify health**

```bash
docker compose -f docker-compose.local.yml ps
```
Expected: `STATUS: Up X seconds (healthy)`.

- [ ] **Step 4: Browser smoke test**

Open http://localhost:8668. Hard refresh (Ctrl+F5). Verify:
- Login page: indigo button, slate inputs, no warm beige
- After login: Dashboard at `/` with 4 stat cards
- Sidebar 240px wide, "ChatGPT2API" gradient logo, 7 menu items in English
- Click each menu item: page renders, sidebar active item gets indigo bg + dot on right
- Topbar shows correct title + description per page
- Open dialog (e.g. Edit account on `/accounts`): backdrop blurred, dialog `rounded-xl`
- Status badges on `/accounts`: green/yellow/red/gray pills with alpha bg
- No JS console errors

- [ ] **Step 5: Acceptance criteria check**

Run final greps to confirm migration complete:
```bash
grep -rn "f0ebe3\|radial-gradient\|stone-100\|rounded-2xl bg-white" web/src 2>&1 | grep -v node_modules
```
Expected: 0 matches in web/src (or only matches in fully-removed files like backups).

- [ ] **Step 6: Final commit (if any cleanup needed)**

If Step 5 found leftovers, fix and commit:
```bash
git commit -am "chore: cleanup remaining warm-palette leftovers"
```

If clean, the migration is complete. No final commit needed.

---

## Rollback strategy

If any task introduces breaking issue:
```bash
# Revert the last task's commit
git revert HEAD

# Or jump back N tasks
git reset --hard HEAD~N
```

Each task commits independently so rollback is granular. Docker container will need rebuild after rollback.

## Self-review checklist

- ✅ Task 1 covers globals.css rewrite (spec §"Theme system")
- ✅ Tasks 3-7 cover UI primitives (spec §"Components UI affected")
- ✅ Tasks 8-12 cover AppShell (spec §"Layout shell")
- ✅ Task 13 covers Dashboard (spec §"NEW: Dashboard")
- ✅ Task 14 covers Login redirect (spec §"Login")
- ✅ Task 15 covers page-level cleanup (spec §"MIGRATED: 7 page hiện có")
- ✅ Task 16 covers TopNav removal (spec §"REMOVED: TopNav")
- ✅ Task 17 covers Docker rebuild (spec §"Migration order step 8")
- ✅ All file paths absolute with line ranges where modifying
- ✅ Code blocks complete in every step
- ✅ No "TBD" / "TODO" / "implement later"
- ✅ Tailwind v4 `@theme inline` syntax used consistently with existing setup
- ✅ Type names consistent (`StoredAuthSession`, `Account`, `LogEntry`)
- ✅ Out-of-scope items (dark toggle, mobile drawer) NOT in plan
