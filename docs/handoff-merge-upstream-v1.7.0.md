# Handoff — Merge upstream v1.7.0 (giữ UI custom + việt hóa)

> **Ngày:** 2026-07-10
> **Commit merge:** `32139af` — `merge: upstream v1.7.0 — giữ UI custom + việt hóa` (đã push `origin/main`)
> **Commit snapshot trước merge:** `1dca70b` — `wip: image tools/compose endpoint, docker upstream compose, api docs`
> **Upstream:** https://github.com/basketikun/chatgpt2api (`upstream/main`, 50 commits mới, v1.4.1 → v1.7.0)

---

## 1. Tổng quan

Mục tiêu: cập nhật toàn bộ tính năng mới từ upstream nhưng **giữ nguyên UI đã custom (theme SubKey, app-shell) và toàn bộ việt hóa** của bản đang dùng.

Kết quả:
- Merge hoàn tất, **0 conflict marker còn lại**, đã push lên `origin/main`.
- Toàn bộ UI mới của upstream (vốn tiếng Trung) đã được **việt hóa có dấu đầy đủ**.
- Chức năng **registration được khôi phục** dù upstream đã xóa hẳn.
- Verify: `bun run build` PASS (10 routes), `tsc --noEmit` PASS (0 lỗi), backend `create_app()` khởi tạo OK với **94 routes**, `config.json` JSON hợp lệ.

Trạng thái nhánh:
- `main` = kết quả cuối, đã push.
- Nhánh tạm `merge-upstream-v1.6` đã xóa (nội dung nằm trọn trong `main`).
- Muốn xem lại bản trước merge: `git checkout 1dca70b` hoặc `git diff 1dca70b..32139af`.

---

## 2. Bối cảnh trước merge

- Local đã diverge **28 commits** so với upstream (theme SubKey, việt hóa toàn bộ, remove background Pixelcut, compose ảnh, app-shell sidebar/topbar thay top-nav, registration custom…).
- Upstream có **50 commits mới**: mask editing, trang debug, PPT/PSD, search API, image storage WebDAV, proxy runtime FlareSolverr/WARP, OAuth login, chat cache… và **commit cuối cùng (`1f96b49`) xóa hẳn chức năng registration**.
- Merge tạo ~30 file conflict (backend Python + web TSX), trong đó nhiều file "conflict toàn file" do cả 2 bên rewrite.

## 3. Nguyên tắc merge đã áp dụng

1. **Logic/tính năng mới** → lấy theo upstream.
2. **UI, text hiển thị, theme** → giữ theo local (tiếng Việt có dấu).
3. Tính năng UI **mới** của upstream → nhận vào rồi việt hóa + wire vào app-shell custom.
4. Tính năng local mà upstream xóa (registration) → **giữ local**, khôi phục cả chuỗi phụ thuộc.
5. Giá trị **data matching** (status tiếng Trung) → tuyệt đối không dịch (xem mục 7).

---

## 4. Chi tiết những gì đã merge

### 4.1 Backend Python

| File | Quyết định |
|---|---|
| `api/ai.py` | Nền upstream (mask qua `parse_image_edit_request`, `/v1/search`, PPT/PSD, editable-file-tasks, `/files/`) + **giữ endpoint `/v1/images/compose` của local** + việt hóa label log ("Tạo ảnh", "Edit ảnh", "Ghép ảnh", "Tạo văn bản", "Tìm kiếm", "Tạo PPT/PSD") |
| `api/app.py` | Nền upstream (`install_exception_handlers`, `start_image_cleanup_scheduler`, route GET+HEAD, **bỏ StaticFiles mount `/images`** — giờ `api/system.py` serve qua route `/images/{path}`) + giữ router local: `image_tools`, `register`, `remove_background` + 2 endpoint custom `/api/download-image`, `/api/delete-images` |
| `api/image_tasks.py` | Upstream (mask, `client_task_id` bắt buộc) + label Việt |
| `config.json` | Giữ giá trị local (`auth-key`, `refresh_account_interval_minute: 60`, `image_retention_days: 999`, block `pixelcut`) + nhận toàn bộ key mới upstream (`image_storage`, `chat_completion_cache`, `image_settle_*`, `third_party_apps`, `proxy_runtime`…) + giữ `backup.include.register: true` |
| `services/config.py` | Nền upstream + chèn lại 2 method `pixelcut`/`update_pixelcut` + `register` trong `DEFAULT_BACKUP_INCLUDE` |
| `services/backup_service.py` | Upstream (backup thêm `image_index.json`) + **chèn lại backup `data/register.json`** |
| `services/account_service.py` | Upstream (OAuth, relogin progress, keepalive refresh token) + label log Việt; status values giữ tiếng Trung (mục 7) |
| `services/content_filter.py` | Upstream (fail-open policy, sanitize base64, request_shape) + error message Việt |
| **Registration (upstream xóa)** | Khôi phục nguyên vẹn từ `main`: `api/register.py`, `services/register_service.py`, `services/register/{__init__,mail_provider,openai_register}.py`, `web/src/app/register/**` |

Các file backend upstream mới nhận nguyên (không conflict): `api/errors.py`, `api/image_inputs.py`, `services/editable_file_task_service.py`, `services/image_storage_service.py`, `services/oauth_login_service.py`… Log message user-facing trong đó đã việt hóa; **`services/openai_backend_api.py` và `services/protocol/conversation.py` giữ nguyên tiếng Trung phần comment/log nội bộ** (bản local trước giờ cũng vậy — ngoài scope).

### 4.2 Web — core

| File | Quyết định |
|---|---|
| `web/src/lib/api.ts` | Nền upstream (đủ API mới) + **block register** (type `RegisterConfig` + 5 hàm) + `deleteImages`, `removeBackground` local. Đã vá type: `Account.image_quota_unknown?`, `BackupInclude.register` + `image_index?` |
| `web/src/app/settings/store.ts` | Nền upstream (proxy runtime, image storage, third-party apps, WebDAV test/sync) + toàn bộ register state/actions local + việt hóa ~30 chuỗi toast |
| `web/src/app/layout.tsx` | **Giữ nguyên local** (AppShell + ThemeProvider + Inter font + lang="vi") |
| `web/src/app/globals.css` | **Giữ nguyên local** — KHÔNG lấy khối `.dark .bg-white {...} !important` của upstream (override cho theme stone của họ, sẽ phá theme SubKey) |
| `web/src/components/theme-toggle.tsx` | Giữ local (upstream dùng AnimatedThemeToggler riêng) |
| `web/src/components/top-nav.tsx` | **Xóa** (local dùng app-shell). Tính năng version-check trong top-nav upstream được port: `VersionReleaseDialog` gắn vào `app-shell/topbar.tsx` |
| `web/src/components/ui/textarea.tsx` | Giữ local + áp fix `flex`→`block` của upstream |
| `web/src/store/image-conversations.ts` | Union field 2 bên: `remove_bg_url` (local) + `startTime/elapsedSecs/elapsedUpdatedAt/durationMs` (upstream) |
| `web/src/components/app-shell/route-meta.ts` | Thêm route `/debug` (title "Debug") vào ROUTE_META + SIDEBAR_ORDER |

### 4.3 Web — trang Image

| File | Quyết định |
|---|---|
| `image/page.tsx` | Nền upstream (model selection, quality/ratio/tier/width/height, scroll tracking, elapsed time, timeout retry, rename conversation) + giữ local: remove background, revisions (`turnRevisions`/`turnViewSlot`), selection, download, lightbox revision nav |
| `image-composer.tsx` | Nền upstream (drag&drop, quality, aspect ratio picker, model dropdown). Props ĐỔI: bỏ `imageSize/onImageSizeChange`, thêm `imageRatio/imageTier/imageWidth/imageHeight/imageQuality/imageModel(+Models)` và callbacks tương ứng. Component `image-size-select.tsx` local **không còn được dùng** (menu setting gộp vào composer) |
| `image-results.tsx` | Nền local (selection, download, remove-bg, loading-snail) + upstream: hiển thị elapsed time, queue fix, blob URL cache, props mới `onTimeoutRetryContinue`/`onDismissErrors` |
| `image-sidebar.tsx` | Upstream (rename) + local (search) + việt hóa |
| `image-manager/page.tsx` | Local features (long-press selection, DateRangeFilter, tags, page header actions) + upstream (storage stats, nén ảnh, download hàng loạt, cleanup-to-target) |
| `image-lightbox.tsx` | Upstream (pinch zoom, pan, swipe) + local (wheel zoom, revision nav, nút download) |

### 4.4 Web — Accounts & Settings

- `accounts/page.tsx`: upstream (progress refresh/relogin realtime, 3 cột mới: Nguồn / Thời gian tạo / Đang sinh `image_inflight`, nút khôi phục tài khoản bất thường) + giữ local quota helpers + việt hóa.
- `account-import-dialog.tsx`: 7 phương thức import — OAuth (mới), Access Token, Session JSON, Codex auth JSON (mới), Account JSON file (mới), CPA Server (local), Sub2API (local).
- `settings/page.tsx`: giữ layout 2 cột local, thêm card mới `ProxyRuntimeCard`, `ThirdPartyAppsCard`.
- `config-card.tsx`: giữ 6 card local + thêm options upstream (settle/check-before-hit, xóa conversation sau khi có ảnh, timeout retry, auto relogin).
- `backup-settings-card.tsx`: giữ checkbox `register` local + thêm `image_index` upstream.

### 4.5 Tính năng mới đã việt hóa + wire

- **Trang `/debug`** (5 tab: Chat, Tìm kiếm, PPT, PSD, Skill) — việt hóa toàn bộ UI, thêm vào sidebar. Default prompt trong ô input cũng đã dịch sang tiếng Việt.
- `api-docs-card.tsx`, `proxy-runtime-card.tsx`, `third-party-apps-card.tsx`, `version-release-dialog.tsx`, `use-version-check.ts` — việt hóa.
- `VersionReleaseDialog` gắn vào topbar (cạnh ThemeToggle) — thông báo khi upstream ra bản mới.

---

## 5. Các quyết định quan trọng + lý do

1. **Giữ registration** dù upstream xóa: bản đang dùng có trang register custom + backup register config. Hệ quả: từ giờ mỗi lần merge upstream sẽ phải giữ tay phần này (upstream không còn maintain nó).
2. **Không lấy CSS dark-override của upstream** (`.dark .bg-white !important`…): nó vá theme stone của upstream, sẽ đè theme SubKey.
3. **Bỏ mount StaticFiles `/images`** theo upstream: route `/images/{image_path:path}` trong `api/system.py` đảm nhiệm (kèm CORS + storage WebDAV). Hai endpoint custom `/api/download-image`, `/api/delete-images` vẫn giữ vì UI local gọi chúng.
4. **`image-size-select.tsx` thành dead code** (composer mới gộp setting vào menu riêng). Chưa xóa — cần Ken xác nhận rồi xóa hoặc đổi `.bak`.
5. **`header-actions.tsx`, `theme-script.tsx`, `animated-theme-toggler.tsx`** (upstream) hiện không được import ở đâu — dead code vô hại, giữ để lần merge sau đỡ conflict.
6. **Skill-panel giữ 2 biến thể prompt Trung/Anh**: đây là nội dung copy-paste gửi cho Codex/Claude để cài skill tìm kiếm, không phải UI text.

## 6. Bug đã bắt và sửa trong quá trình merge

Các lỗi này do agent dịch/merge gây ra, đã sửa xong — ghi lại để hiểu tại sao code có dạng hiện tại:

1. **Timeout match vỡ**: message timeout gốc từ `openai_backend_api.py` vẫn là `"...生图超时..."`, nhưng check ở `image_task_service.py` bị dịch chỉ còn tìm `"hết thời gian"`. Đã sửa thành match cả 3 biến thể: `"超时"`, `"hết thời gian"`, `"timeout"` (dòng ~454).
2. **Status value bị dịch nhầm**: `"Vô hiệu hóa"`/`"Bình thường"`/`"Bất thường"`/`"Thành công"` xuất hiện trong so sánh/gán status ở `account_service.py`, và `"disabled"` trong `image/page.tsx` — tất cả đã revert về giá trị Trung gốc (xem mục 7).
3. **`image-manager` mất việt hóa**: agent lấy nguyên bản upstream (373 ký tự Trung) — đã yêu cầu merge lại đúng.
4. **4 lỗi type**: `BackupInclude` thiếu `register`/`image_index`; `Account` thiếu `image_quota_unknown?`; `setImageSize` không tồn tại trong hàm `handleReuseTurnConfigAsNew` (đã chuyển sang bộ setter mới ratio/tier/width/height/quality/model theo pattern upstream).

## 7. ⚠️ Hợp đồng dữ liệu — chuỗi tiếng Trung KHÔNG ĐƯỢC DỊCH

Các giá trị sau lưu trong `data/accounts.json` / progress state và được so sánh ở cả backend lẫn frontend. Dịch chúng = vỡ app. (Đã lưu vào memory Claude của project.)

| Chuỗi | Vai trò | Nơi so sánh |
|---|---|---|
| `正常` `限流` `异常` `禁用` | Account status | `account_service.py`, `accounts/page.tsx` (STATUS_META map sang label Việt), `page.tsx`, `image/page.tsx`, `api.ts` (`type AccountStatus`) |
| `成功` `跳过` | Relogin/refresh progress result | `account_service.py` (`update_relogin_progress`), `accounts/page.tsx` (`r.status === "成功"`, `status_counts?.["正常"]`) |
| `超时` | Error timeout matching | Sinh ở `openai_backend_api.py:2285`; check ở `image_task_service.py` + `image-results.tsx` (`error?.includes("超时")`) |

Muốn việt hóa triệt để nhóm này phải đổi **đồng bộ cả backend + frontend + migrate data cũ** — không làm lẻ tẻ.

## 8. Verify đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `bun run build` (web, Next.js 16 Turbopack) | ✅ PASS — 10 routes: `/`, `/accounts`, `/debug`, `/image`, `/image-manager`, `/login`, `/logs`, `/register`, `/settings`, `/_not-found` |
| `bunx tsc --noEmit` | ✅ PASS — 0 lỗi |
| `python -c "from api.app import create_app; create_app()"` | ✅ PASS — 94 routes |
| Syntax toàn bộ `api/`, `services/`, `utils/` (ast.parse) | ✅ PASS |
| `config.json` | ✅ JSON hợp lệ |
| Quét conflict marker toàn repo | ✅ 0 |
| Quét chữ Trung `web/src` | ✅ Chỉ còn giá trị data (mục 7) + prompt mẫu skill-panel |

**Chưa verify runtime thực tế** (chưa chạy server + bấm thử UI): sinh ảnh với mask, trang debug, registration flow, remove background sau merge. Nên test sau khi rebuild Docker (xem mục 10).

## 9. Cảnh báo security (từ review tự động — code upstream, chưa xử lý)

Giữ nguyên trạng theo nguyên tắc không đổi hành vi upstream ngoài scope. Nếu server expose ra internet thì nên vá:

1. **HIGH — `/files/{path}` không cần auth** (`api/ai.py`): tải file PPT/PSD chỉ cần biết link. Đã có chống path-traversal (`resolve` + `relative_to` trong `editable_file_task_service.public_file_path`). Vá: thêm `require_identity` + kiểm ownership (lưu ý sẽ phá link download dạng `<a href>` không kèm header).
2. **HIGH — SSRF** (`api/image_inputs.py`): fetch `image_url` do user cung cấp không chặn IP nội bộ (loopback/RFC1918), `allow_redirects=True`.
3. **HIGH — `verify=False`** (`services/oauth_login_service.py`): tắt TLS verify khi gọi OAuth token (có thể do chạy qua proxy MITM/FlareSolverr — cần cân nhắc trước khi bật lại).
4. **MEDIUM — Secrets in logs** (`services/openai_backend_api.py`): debug log chứa JWT claims + email account.

## 10. Dependencies mới + Deploy

**Web** (`web/package.json`):
- `lucide-react` `^0.523.0` → `^1.17.0` (**major bump** — build đã pass, icon dùng đều còn tồn tại)
- Mới: `radix-ui ^1.4.3`, `react-markdown ^10.1.0`, `remark-gfm ^4.0.1`
- Đã chạy `bun install` local.

**Python** (`pyproject.toml`): không đổi. Lưu ý môi trường Windows local trước đây thiếu `sqlalchemy` + `gitpython` — em đã pip install để verify; Docker image tự cài theo `pyproject.toml`.

**Deploy**: chạy `rebuild.bat` (Docker prod port **8668**) như thường lệ. `VERSION` giờ là `1.7.0`, có `CHANGELOG.md` mới từ upstream. KHÔNG tự chạy dev server — hỏi Ken (memory rule).

## 11. Việc còn lại / đề xuất

- [ ] **Test runtime** các flow chính sau rebuild: sinh ảnh (thường + mask), remove background, compose, registration, trang debug, import account OAuth/JSON, backup (có register + image_index).
- [ ] Quyết định số phận `image-size-select.tsx` (dead code — xóa hoặc `.bak`).
- [ ] Cân nhắc vá 4 finding security (mục 9) nếu expose internet.
- [ ] `README.md` giữ bản tiếng Việt local — chưa bổ sung mô tả tính năng mới v1.5→v1.7 (debug, storage, proxy runtime…). Viết thêm nếu cần.
- [ ] Lần merge upstream sau: đọc lại tài liệu này + memory `project-chinese-data-values`; đặc biệt chú ý phần registration (upstream không còn code này, mọi conflict dạng modify/delete phải giữ local).

## 12. Rollback

```bash
# Quay về bản trước merge (đã push nên cần revert, không reset):
git revert -m 1 32139af          # revert merge commit, giữ lịch sử
# Hoặc xem lại bản cũ tạm thời:
git checkout 1dca70b
```

Backup dữ liệu (`data/`) không bị merge đụng tới — accounts.json, register.json giữ nguyên.
