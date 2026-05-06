# SubKey Theme Migration — Design Spec

**Date:** 2026-05-06
**Author:** Lina (with Ken Hoàng)
**Reference:** `D:\Work\WAMP\www\subkey-serverless` admin panel

## Mục tiêu

Áp dụng design system "SubKey Admin" cho frontend ChatGPT2API: đổi palette warm beige → indigo/slate, thêm shell layout sidebar+topbar (hiện đang dùng TopNav-only), tạo Dashboard mới ở `/`. Giữ nguyên toàn bộ logic backend và component logic hiện có — chỉ thay presentation layer.

## Quyết định kiến trúc

### Stack — giữ nguyên, chỉ đổi style internal

ChatGPT2API hiện dùng:
- Next.js 16.2.3 App Router + React 19.2.5
- Tailwind v4 (PostCSS auto, `@theme inline` directive)
- shadcn/ui components qua Radix primitives (`<Card>`, `<Button>`, `<Badge>`, `<Dialog>`...)

SubKey dùng pure Tailwind v3 + custom CSS classes (`.btn`, `.card`, `.badge`) không Radix. **Không port pattern này.** Thay vào đó: giữ Radix components, đổi `cva` variants + className internal để đạt visual SubKey.

Lý do: Radix cho a11y (focus trap, keyboard nav, ARIA) miễn phí. Bỏ Radix sẽ phải tự re-implement mọi behavior. Không đáng đánh đổi.

### Theme system — port CSS variables sang Tailwind v4 syntax

SubKey dùng `:root` + `.dark` định nghĩa CSS vars (`--surface`, `--content`, `--border`...) rồi map vào `tailwind.config.js`. Tailwind v4 dùng `@theme` block trong CSS thay cho config file. Convert:

```css
@theme inline {
  --color-bg-app: var(--bg-app);
  --color-surface: var(--surface);
  --color-surface-secondary: var(--surface-secondary);
  --color-content: var(--content);
  --color-content-secondary: var(--content-secondary);
  --color-border: var(--border);
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  /* ... full primary scale 50-950 */
  --radius-card: 0.75rem;     /* 12px */
  --radius-button: 0.5rem;    /* 8px */
}

:root {
  --bg-app: #f8fafc;
  --surface: #ffffff;
  --surface-secondary: #f1f5f9;
  --surface-tertiary: #e2e8f0;
  --border: #e2e8f0;
  --content: #0f172a;
  --content-secondary: #475569;
  --content-tertiary: #94a3b8;
  /* shadows, scrollbar, glass — copy nguyên từ SubKey */
}

.dark { /* same vars, dark values từ SubKey index.css line 53-88 */ }
```

Dark mode infrastructure được setup nhưng **không thêm toggle UI ở v1** (out of scope). User có thể bật bằng cách add `class="dark"` vào `<html>` thủ công.

### Component styling pattern

Mỗi shadcn primitive (`button.tsx`, `card.tsx`, `badge.tsx`, ...) trong `web/src/components/ui/` sẽ:
1. Đổi `cva` variants để dùng tokens mới (`bg-surface`, `border-border`, `text-content-secondary`)
2. Đổi default radius (button `rounded-lg` 8px, card `rounded-xl` 12px)
3. Badge: thêm variants `success/warning/error/info/gray` với bg `rgba(color, 0.15)` + text màu đậm

Page-level files (`accounts/page.tsx`, etc.) **không phải sửa cv styling** — chỉ thay class `rounded-2xl bg-white/80` → `rounded-xl bg-surface` ở vài chỗ inline (sed-able).

## Design tokens

### Colors

| Token | Light | Dark |
|---|---|---|
| `--bg-app` | `#f8fafc` | `#0a0a0f` |
| `--surface` | `#ffffff` | `#12121a` |
| `--surface-secondary` | `#f1f5f9` | `#1a1a24` |
| `--surface-tertiary` | `#e2e8f0` | `#24242f` |
| `--border` | `#e2e8f0` | `#2a2a3a` |
| `--content` | `#0f172a` | `#f8fafc` |
| `--content-secondary` | `#475569` | `#a1a1aa` |
| `--content-tertiary` | `#94a3b8` | `#71717a` |

**Primary scale (indigo):** `50: #eef2ff` → `500: #6366f1` → `950: #1e1b4b` — copy nguyên từ SubKey config.

**Status colors** (cho stat badge dashboard, không phải account status enum):
- success: `#22c55e` (bg `rgba(34,197,94,0.15)`)
- warning: `#ca8a04` (bg `rgba(234,179,8,0.15)`)
- error: `#dc2626` (bg `rgba(239,68,68,0.15)`)
- info: `#2563eb` (bg `rgba(59,130,246,0.15)`)
- purple: `#5b21b6` (bg `rgba(139,92,246,0.15)`)

### Typography
- Font family: **Inter** (Google Fonts, qua `next/font`). Fallback Vietnamese: `system-ui`. Bỏ SF Pro / PingFang.
- Body: `14px / 1.5`
- H1: `18px / 600 weight`
- Stat numbers: `28px / 700 weight / letter-spacing -0.02em`

### Border radius
- Card: `0.75rem` (12px)
- Button / input / select: `0.5rem` (8px)
- Badge: `999px` (rounded-full)
- Avatar / icon box: `0.625rem` (10px)

### Shadows
Copy 4 levels từ SubKey: `--shadow-sm/md/lg/xl`. Card hover: `shadow-sm` → `shadow-md`.

### Animations
Port 6 keyframes từ SubKey config: `fadeIn / slideIn / slideUp / scaleIn / shimmer / pulseSoft`.

## Layout shell

### Cấu trúc

```
<RootLayout>
  <AppShell>            ← NEW
    <Sidebar />         ← NEW (w-240px fixed left)
    <main>
      <Topbar />        ← NEW (h-64px sticky glass)
      {children}        ← page content
    </main>
  </AppShell>
</RootLayout>
```

### Sidebar (`web/src/components/app-shell/sidebar.tsx`)
- Width 240px, fixed left, full-height
- Header: 64px, border-bottom, padding 24px. Logo: text-only `ChatGPT` (gradient indigo-500 → indigo-400, bg-clip-text) + `2API` (slate-400 font-light)
- Nav items: padding `10px 16px`, gap 4px giữa items, `rounded-xl 12px`, font 14px medium
  - Inactive: `text-content-secondary`, hover `bg-surface-secondary`
  - Active: `bg-primary-500/10 text-primary-600` + dot 6px tròn `bg-primary-500` ở `ml-auto`
- Footer: profile card (avatar gradient + name + email) + nút Logout đỏ-trên-hover

**Items (English):**
1. Dashboard → `/`
2. Accounts → `/accounts`
3. Image → `/image`
4. Image History → `/image-manager`
5. Logs → `/logs`
6. Auto Register → `/register`
7. Settings → `/settings`

Login (`/login`) **không vào sidebar** — chỉ hiện khi chưa auth, layout riêng.

### Topbar (`web/src/components/app-shell/topbar.tsx`)
- Height 64px, sticky top, `bg-white/80 backdrop-blur-xl`, border-bottom
- Trái: page title (h1 18px) + description nhỏ (text-tertiary)
- Phải: role pill (`bg-primary-500/10 text-primary-600 rounded-full px-3 py-1.5` với dot prefix) + bell icon (relative, badge đỏ với count)

Page title + description lấy từ static map (`route-meta.ts`):

| Path | Title | Description |
|---|---|---|
| `/` | Dashboard | Tổng quan hệ thống ChatGPT2API |
| `/accounts` | Accounts | Quản lý nhóm tài khoản OpenAI |
| `/image` | Image | Tạo ảnh với gpt-image-2 |
| `/image-manager` | Image History | Lịch sử các tác vụ ảnh đã tạo |
| `/logs` | Logs | Nhật ký hoạt động hệ thống |
| `/register` | Auto Register | Đăng ký tài khoản OpenAI tự động |
| `/settings` | Settings | Cấu hình hệ thống và tích hợp |

### Mobile (out of scope v1)
Sidebar mobile drawer behavior (translate-x-full + hamburger) **không implement v1**. Giả định desktop-only cho admin tool.

## Pages affected

### NEW: Dashboard `/` (`web/src/app/page.tsx`)
File chưa tồn tại, tạo mới. Render:
- 4 stat cards trên cùng (mỗi card có icon-box top-right 38x38px `bg-primary-500/10 text-primary-600 rounded-lg` chứa 1 chữ cái: `A` / `Q` / `I` / `%`):
  - **Tổng tài khoản** (icon `A`) — count from `accountService.list_accounts()`, sub: `${active} bình thường`
  - **Hạn mức còn** (icon `Q`) — sum quota của tài khoản status `正常`
  - **Ảnh hôm nay** (icon `I`) — count log `type=call` hôm nay (filter theo `time` startswith YYYY-MM-DD)
  - **Tỉ lệ thành công** (icon `%`) — `success / (success+failed)` của log call 7 ngày qua
- 2 cột:
  - **Trạng thái tài khoản** — 5 status mini-cards (Bình thường / Giới hạn / Bất thường / Vô hiệu hoá / Hạn mức) với background pastel
  - **API Activity** — count request hôm nay (1 số lớn + label)
- **Hoạt động gần đây** — 5 dòng log mới nhất (summary + meta + time)

API endpoints cần thêm: `GET /api/dashboard/stats` (tổng hợp), `GET /api/dashboard/recent-logs?limit=5`. Hoặc dùng client-side aggregation từ `/api/accounts` + `/api/logs` đã có (đơn giản hơn, chọn cách này).

### MIGRATED: 7 page hiện có
Mỗi page hiện wrapped trong TopNav-based layout. Sau migration: wrap trong AppShell, **content giữ nguyên 100% logic**, chỉ:
- Đổi outer container class: bỏ `max-w-[1440px] mx-auto`, dùng `p-6` (Topbar đã handle padding ngang)
- Đổi card class inline: `rounded-2xl bg-white/80` → `rounded-xl bg-surface border border-border`
- Status badge color refresh: `success/warning/danger` variants giữ tên, đổi style internal qua `cva`

### REMOVED: TopNav (`web/src/components/top-nav.tsx`)
File hiện có, sẽ xoá sau khi xác nhận AppShell hoạt động.

### Login `/login` — layout độc lập
Login page không dùng AppShell (chưa auth). Chỉ áp theme palette: bg `bg-app`, card centered, button indigo. Sau login redirect → `/` thay vì `/accounts`.

## Components UI affected

| File | Action |
|---|---|
| `web/src/app/globals.css` | Rewrite `:root` + `.dark` blocks, thêm `@theme inline` mappings |
| `web/src/components/ui/button.tsx` | Đổi `cva` variants: primary indigo, radius `lg`, scale(0.98) on active |
| `web/src/components/ui/card.tsx` | Default `rounded-xl border-border bg-surface shadow-sm` |
| `web/src/components/ui/badge.tsx` | Thêm variants `success/warning/error/info` với bg alpha 15% |
| `web/src/components/ui/input.tsx` | Border `border-border`, focus ring `primary-500/15` |
| `web/src/components/ui/dialog.tsx` | Modal overlay `bg-black/50 backdrop-blur-sm`, content `bg-surface rounded-xl` |
| `web/src/components/app-shell/sidebar.tsx` | NEW |
| `web/src/components/app-shell/topbar.tsx` | NEW |
| `web/src/components/app-shell/app-shell.tsx` | NEW (wrapper composing sidebar + topbar + main) |
| `web/src/components/app-shell/route-meta.ts` | NEW (map pathname → title + description) |
| `web/src/app/layout.tsx` | Wrap `<AppShell>` quanh children, đổi font sang Inter, bỏ radial gradient bg |
| `web/src/app/login/page.tsx` | Áp theme mới, **không** dùng AppShell |
| `web/src/app/page.tsx` | NEW — Dashboard |

## Migration order (cho implementation plan)

1. **Tokens layer** — rewrite `globals.css` (CSS vars + @theme). Validate: dev server lên, color tokens accessible qua `bg-surface` etc.
2. **UI primitives** — đổi `button/card/badge/input/dialog` cva variants. Validate: visual smoke test trên page bất kỳ.
3. **AppShell** — tạo sidebar/topbar/route-meta + wrap layout. Validate: navigate giữa các page, sidebar active state đúng.
4. **Dashboard mới** — tạo `app/page.tsx` + client-side aggregation. Validate: số liệu khớp với pages khác.
5. **Page-level cleanup** — bỏ `max-w-[1440px]`, đổi `rounded-2xl bg-white/80` inline → `bg-surface`. Validate: không còn warm beige.
6. **Login** — refresh palette, đổi redirect đích.
7. **Cleanup** — xoá `top-nav.tsx`.
8. **Rebuild Docker** — verify production build OK.

Mỗi bước commit riêng để rollback dễ.

## Out of scope v1

- Dark mode toggle UI (infrastructure có sẵn, user tự bật class)
- Mobile sidebar drawer (admin-only desktop assumption)
- Animations cho Dashboard cards (chỉ port keyframes, không apply mọi nơi)
- Lucide icons trong sidebar (theo yêu cầu user — text-only)
- Bỏ TopNav-related CPA/Sub2API import dialog navigation (pages cũ giữ logic, chỉ refresh style)
- i18n key cho menu items (hardcoded English string, không cần dịch)

## Risks

1. **Tailwind v4 `@theme` syntax** — Tôi confident về syntax nhưng nếu PostCSS pipeline có vấn đề, fallback dùng `:root` raw vars + `bg-[var(--surface)]` arbitrary class. Xác minh ngay bước 1.
2. **Radix component style override** — một số Radix internal element có inline style. Có thể cần `data-state` selectors trong CSS. Phát hiện sớm nếu dialog/popover render lệch theme.
3. **Existing tests** — không có frontend test suite hiện hành (đã verify). Visual regression phải làm thủ công.
4. **Logic bug ngầm** — `image/page.tsx:75` đã từng có bug `account.status !== "vô hiệu hoá"` (đã fix trong session trước). Khi sửa thêm files khác cần cẩn thận với enum protocol value.

## Acceptance criteria

- [ ] `/` hiển thị Dashboard mới với 4 stat cards + status breakdown + recent activity
- [ ] Sidebar 240px hiển thị 7 menu items (English), active item có dot phải + bg indigo/10
- [ ] Topbar 64px sticky glass, hiển thị page title + role pill + bell
- [ ] 7 pages cũ (accounts, image, image-manager, logs, register, settings) render OK trong shell mới
- [ ] Login page áp theme indigo/slate, redirect → `/`
- [ ] Bỏ hoàn toàn warm beige radial gradient (grep `f0ebe3` và `radial-gradient` trong web/src trả 0 kết quả ngoài migration files)
- [ ] Build Docker image OK, container healthy
- [ ] Không có console error trên browser
