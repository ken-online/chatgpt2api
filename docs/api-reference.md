# API Reference

**Base URL:** `http://your-server:port`  
**Swagger UI:** `http://your-server:port/docs`  
**ReDoc:** `http://your-server:port/redoc`

---

## Xác thực

Tất cả endpoint (trừ `/version` và `/api/remove-background`) yêu cầu header:

```
Authorization: Bearer <api-key>
```

Riêng `POST /v1/messages` (Anthropic) còn nhận thay thế bằng:

```
x-api-key: <api-key>
anthropic-version: 2023-06-01
```

Có hai loại quyền:

| Loại | Mô tả |
|------|-------|
| **Admin** | Khoá cấu hình trong `config.json` → `auth-key`, hoặc Admin key tạo qua UI |
| **User** | User key tạo qua UI trang Settings |

- Endpoint AI (`/v1/...`) chấp nhận cả Admin và User key.
- Endpoint quản trị (`/api/...`) chỉ chấp nhận Admin key.
- Endpoint nội bộ `/api/remove-background` không yêu cầu khoá (xem mục 5).

---

## 1. AI — Chat & Responses

### POST `/v1/chat/completions`
Tạo phản hồi chat (tương thích OpenAI).

**Headers:** `Authorization: Bearer <key>`

**Request body (JSON):**
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Xin chào!" }
  ],
  "stream": false
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `model` | string | ✓ | Tên model |
| `messages` | array | ✓ | Lịch sử hội thoại |
| `stream` | boolean | | Bật SSE stream (mặc định: `false`) |
| `n` | integer | | Số phản hồi trả về |

**Response:** Tương thích OpenAI Chat Completions format.

---

### POST `/v1/responses`
Tạo phản hồi theo OpenAI Responses API.

**Request body (JSON):**
```json
{
  "model": "gpt-4o",
  "input": "Giải thích về AI",
  "stream": false
}
```

---

### POST `/v1/messages`
Tạo phản hồi theo Anthropic Messages API.

**Headers (chọn một dạng auth):**
```
Authorization: Bearer <key>
anthropic-version: 2023-06-01
```
hoặc:
```
x-api-key: <key>
anthropic-version: 2023-06-01
```

**Request body (JSON):**
```json
{
  "model": "claude-opus-4-5",
  "messages": [
    { "role": "user", "content": "Xin chào!" }
  ],
  "max_tokens": 1024,
  "stream": false
}
```

---

### GET `/v1/models`
Liệt kê danh sách models khả dụng.

**Response:**
```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4o", "object": "model", ... }
  ]
}
```

---

## 2. Tạo & Chỉnh sửa ảnh

### POST `/v1/images/generations`
Tạo ảnh từ prompt văn bản.

**Request body (JSON):**
```json
{
  "prompt": "Một con mèo đang ngồi trên mây",
  "model": "gpt-image-2",
  "n": 1,
  "size": "1024x1024",
  "response_format": "b64_json"
}
```

| Trường | Kiểu | Mặc định | Mô tả |
|--------|------|----------|-------|
| `prompt` | string | — | Bắt buộc, mô tả ảnh muốn tạo |
| `model` | string | `"gpt-image-2"` | Model tạo ảnh |
| `n` | integer | `1` | Số ảnh tạo ra (1–4) |
| `size` | string | tự chọn | Kích thước ảnh, ví dụ `"1024x1024"`, `"1024x1536"`, `"1536x1024"` |
| `response_format` | string | `"b64_json"` | `"url"` hoặc `"b64_json"` |
| `history_disabled` | boolean | `true` | Không lưu lịch sử tác vụ ảnh |
| `stream` | boolean | `false` | Bật stream tiến độ (nếu provider hỗ trợ) |

**Response:** Tương thích OpenAI Images API:
```json
{
  "created": 1730000000,
  "data": [
    { "b64_json": "<base64 PNG>", "url": "/images/2026/05/11/gen_xxx.png" }
  ]
}
```

---

### POST `/v1/images/edits`
Chỉnh sửa ảnh có sẵn theo prompt. Hỗ trợ một hoặc nhiều ảnh tham chiếu.

**Content-Type:** `multipart/form-data`

| Field | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `image` hoặc `image[]` | file (lặp lại) | — | Bắt buộc — một hoặc nhiều ảnh tham chiếu |
| `prompt` | text | — | Bắt buộc, mô tả chỉnh sửa |
| `model` | text | `"gpt-image-2"` | Model sử dụng |
| `n` | text (int) | `1` | Số ảnh output (1–4) |
| `size` | text | tự chọn | Kích thước output |
| `response_format` | text | `"b64_json"` | `"url"` hoặc `"b64_json"` |
| `stream` | text (bool) | `false` | Bật stream tiến độ |

**Ví dụ cURL:**
```bash
curl -X POST http://localhost:8668/v1/images/edits \
  -H "Authorization: Bearer <key>" \
  -F "image=@photo.png" \
  -F "prompt=Thêm nền biển xanh" \
  -F "model=gpt-image-2"
```

---

### POST `/v1/images/compose`
Ghép nhiều ảnh thành một ảnh mới theo prompt (yêu cầu **tối thiểu 2 ảnh**).

**Content-Type:** `multipart/form-data`

| Field | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `image` hoặc `image[]` | file (lặp lại) | — | Bắt buộc — ít nhất 2 ảnh |
| `prompt` | text | `""` | Mô tả cách ghép (có thể để trống) |
| `model` | text | `"gpt-image-2"` | Model sử dụng |
| `n` | text (int) | `1` | Số ảnh output (1–4) |
| `size` | text | tự chọn | Kích thước output |
| `response_format` | text | `"b64_json"` | `"url"` hoặc `"b64_json"` |
| `stream` | text (bool) | `false` | Bật stream tiến độ |

**Ví dụ cURL — ghép 2 ảnh:**
```bash
curl -X POST http://localhost:8668/v1/images/compose \
  -H "Authorization: Bearer <key>" \
  -F "image=@person.png" \
  -F "image=@background.png" \
  -F "prompt=Ghép người vào nền phong cảnh, ánh sáng tự nhiên"
```

---

## 3. Xóa nền ảnh (Public API)

### POST `/v1/images/remove-background`
Xóa nền ảnh bằng AI. Yêu cầu cấu hình Pixelcut token trên server (`config.json` → `pixelcut`).

**Content-Type:** `multipart/form-data`

**Gửi một trong ba cách:**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `image` | file | Upload file ảnh trực tiếp |
| `image_url` | text | URL ảnh (HTTP/HTTPS hoặc `/images/...` nội bộ) |
| `image_b64` | text | Chuỗi base64 của ảnh |

**Response:**
```json
{
  "b64_json": "<PNG base64>",
  "url": "/images/2025/05/09/nobg_1234_abcd.png"
}
```

**Ví dụ — upload file:**
```bash
curl -X POST http://localhost:8668/v1/images/remove-background \
  -H "Authorization: Bearer <key>" \
  -F "image=@photo.jpg"
```

**Ví dụ — truyền URL:**
```bash
curl -X POST http://localhost:8668/v1/images/remove-background \
  -H "Authorization: Bearer <key>" \
  -F "image_url=https://example.com/photo.jpg"
```

**Cấu hình server** (`config.json`):
```json
{
  "pixelcut": {
    "id_token": "...",
    "org_id": "...",
    "refresh_token": "..."
  }
}
```

> Token Pixelcut tự động cập nhật vào config khi hết hạn và được refresh thành công.

---

## 4. Image Tasks (Tác vụ ảnh nền)

Các endpoint dưới đây hỗ trợ tạo/theo dõi tác vụ ảnh bất đồng bộ (có lịch sử hội thoại).

### GET `/api/image-tasks`
Lấy danh sách tác vụ của user hiện tại.

**Query params:**
- `ids` *(tuỳ chọn)* — danh sách ID ngăn cách bằng dấu phẩy

---

### POST `/api/image-tasks/generations`
Tạo tác vụ sinh ảnh mới.

**Request body (JSON):**
```json
{
  "client_task_id": "uuid-của-client",
  "prompt": "Một ngôi nhà nhỏ giữa rừng",
  "model": "dall-e-3",
  "size": "1024x1024"
}
```

---

### POST `/api/image-tasks/edits`
Tạo tác vụ chỉnh sửa ảnh.

**Content-Type:** `multipart/form-data`

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `client_task_id` | text | ID tác vụ phía client |
| `prompt` | text | Mô tả chỉnh sửa |
| `model` | text | Model |
| `size` | text | Kích thước |
| `image` / `image[]` | file | Một hoặc nhiều ảnh tham chiếu |

---

## 5. Remove Background (Internal)

### POST `/api/remove-background`
Endpoint nội bộ dùng bởi giao diện web. **Không cần header `Authorization`** — người dùng cung cấp Pixelcut credentials trực tiếp trong body (server chỉ làm proxy CORS).

**Request body (JSON):**
```json
{
  "image_url": "/images/2025/05/09/photo.png",
  "image_mime": "image/png",
  "id_token": "<firebase-id-token>",
  "org_id": "<pixelcut-org-id>",
  "refresh_token": "<firebase-refresh-token>"
}
```

> Dùng `image_url` hoặc `image_b64` (chọn một).

**Response:**
```json
{
  "b64_json": "<PNG base64>",
  "image_url": "/images/2025/05/09/nobg_xxx.png",
  "new_id_token": null,
  "new_refresh_token": null
}
```

> Khi `id_token` hết hạn và `refresh_token` được cung cấp, server tự gọi Firebase để gia hạn rồi retry. Nếu gia hạn thành công, `new_id_token` và `new_refresh_token` sẽ có giá trị mới — client nên lưu lại để dùng cho lần sau.

---

## 6. Quản trị hệ thống

> Tất cả endpoint dưới đây yêu cầu **Admin key**.

### POST `/auth/login`
Xác thực và lấy thông tin tài khoản hiện tại.

**Response:**
```json
{
  "ok": true,
  "version": "1.0.0",
  "role": "admin",
  "subject_id": "admin",
  "name": "Quản trị viên"
}
```

---

### GET `/version`
Lấy phiên bản ứng dụng (không cần xác thực).

**Response:** `{ "version": "1.0.0" }`

---

### GET `/api/settings`
Lấy cấu hình hệ thống hiện tại.

### POST `/api/settings`
Cập nhật cấu hình hệ thống.

**Request body (JSON) — các trường thông dụng:**
```json
{
  "refresh_account_interval_minute": 5,
  "image_retention_days": 30,
  "image_poll_timeout_secs": 120,
  "image_account_concurrency": 3,
  "proxy": "http://proxy:8080",
  "base_url": "https://api.openai.com",
  "global_system_prompt": ""
}
```

### POST `/api/proxy/test`
Kiểm tra một proxy URL có hoạt động không.

**Request body (JSON):**
```json
{ "url": "http://user:pass@proxy.example:8080" }
```

> Nếu để `url` trống, server sẽ kiểm tra proxy đang cấu hình trong `config.json`.

**Response:**
```json
{ "result": { "ok": true, "latency_ms": 320, "ip": "1.2.3.4" } }
```

### GET `/api/storage/info`
Lấy thông tin storage backend đang dùng (local / R2 / S3...) và trạng thái sức khoẻ.

**Response:**
```json
{
  "backend": { "type": "local", "path": "..." },
  "health": { "ok": true, "writable": true }
}
```

---

## 7. Quản lý tài khoản

### GET `/api/accounts`
Liệt kê tất cả tài khoản.

### POST `/api/accounts`
Thêm tài khoản mới.
```json
{ "tokens": ["token1", "token2"] }
```

### DELETE `/api/accounts`
Xóa tài khoản.
```json
{ "tokens": ["token1"] }
```

### POST `/api/accounts/refresh`
Làm mới thông tin tài khoản.
```json
{ "access_tokens": ["token1"] }
```

### POST `/api/accounts/update`
Cập nhật trạng thái/quota tài khoản.
```json
{
  "access_token": "token1",
  "type": "pro",
  "status": "正常",
  "quota": 100
}
```

---

## 8. API Keys người dùng

### GET `/api/auth/users`
Liệt kê tất cả user key.

### POST `/api/auth/users`
Tạo user key mới.
```json
{ "name": "Khách hàng A" }
```

**Response:** `{ "item": {...}, "key": "<raw-key>", "items": [...] }`

> Raw key chỉ hiển thị một lần khi tạo, không thể xem lại.

### POST `/api/auth/users/{key_id}`
Cập nhật user key (đổi tên, bật/tắt, đổi key).
```json
{
  "name": "Tên mới",
  "enabled": true,
  "key": "new-raw-key"
}
```

### DELETE `/api/auth/users/{key_id}`
Xóa user key.

---

## 9. Ảnh & Tags

### GET `/api/images`
Liệt kê ảnh đã tạo.

**Query params:**
- `start_date` — định dạng `YYYY-MM-DD`
- `end_date` — định dạng `YYYY-MM-DD`

### POST `/api/images/delete`
Xóa ảnh. Có 2 chế độ:

- **Theo danh sách path** — truyền `paths`.
- **Theo khoảng ngày** — truyền `start_date` + `end_date` + `all_matching=true`.

```json
{
  "paths": ["/images/2025/05/09/photo.png"],
  "start_date": "",
  "end_date": "",
  "all_matching": false
}
```

### GET `/api/images/tags`
Liệt kê tất cả tags.

### POST `/api/images/tags`
Gắn tag cho ảnh.
```json
{
  "path": "/images/2025/05/09/photo.png",
  "tags": ["phong cảnh", "ban ngày"]
}
```

### DELETE `/api/images/tags/{tag}`
Xóa tag khỏi tất cả ảnh.

---

## 10. Logs

### GET `/api/logs`
Lấy logs hệ thống.

**Query params:**
- `type` — loại log
- `start_date`, `end_date` — lọc theo ngày

### POST `/api/logs/delete`
Xóa log theo ID.
```json
{ "ids": ["log-id-1", "log-id-2"] }
```

---

## 11. Backup

### GET `/api/backups`
Liệt kê các bản backup.

### POST `/api/backups/run`
Chạy backup ngay lập tức.

### POST `/api/backups/delete`
Xóa bản backup.
```json
{ "key": "backup-key" }
```

### GET `/api/backups/download`
Tải file backup.

**Query param:** `key=<backup-key>`

### POST `/api/backup/test`
Kiểm tra kết nối Cloudflare R2.

### GET `/api/backups/detail`
Xem chi tiết một bản backup theo `key`.

**Query param:** `key=<backup-key>`

---

## 12. Đăng ký tài khoản tự động

### GET `/api/register`
Lấy cấu hình đăng ký.

### POST `/api/register`
Cập nhật cấu hình đăng ký.

### POST `/api/register/start`
Khởi động tác vụ đăng ký tự động.

### POST `/api/register/stop`
Dừng tác vụ đăng ký.

### POST `/api/register/reset`
Đặt lại trạng thái đăng ký (xoá lịch sử tiến độ, lỗi).

### GET `/api/register/events`
Stream trạng thái đăng ký theo thời gian thực (SSE).

**Query param:** `token=<admin-key>`

**Ví dụ kết nối:**
```javascript
const es = new EventSource("/api/register/events?token=<admin-key>");
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 13. CPA Pools (nguồn tài khoản từ xa)

> Tất cả yêu cầu Admin. `secret_key` của pool **không bao giờ** xuất hiện trong response.

### GET `/api/cpa/pools`
Liệt kê các pool CPA đã cấu hình.

### POST `/api/cpa/pools`
Thêm pool mới.
```json
{
  "name": "Pool A",
  "base_url": "https://cpa.example.com",
  "secret_key": "<key>"
}
```

### POST `/api/cpa/pools/{pool_id}`
Cập nhật pool (chỉ truyền field cần đổi).
```json
{ "name": "Pool A v2", "base_url": "...", "secret_key": "..." }
```

### DELETE `/api/cpa/pools/{pool_id}`
Xoá pool.

### GET `/api/cpa/pools/{pool_id}/files`
Liệt kê các file token có sẵn trong pool (cho phép chọn import).

### POST `/api/cpa/pools/{pool_id}/import`
Bắt đầu tác vụ import token từ pool.
```json
{ "names": ["file1.txt", "file2.txt"] }
```

### GET `/api/cpa/pools/{pool_id}/import`
Lấy tiến độ import hiện tại của pool.

---

## 14. Sub2API Servers (đồng bộ tài khoản từ server Sub2API)

> Tất cả yêu cầu Admin. `password` và `api_key` của server **không** xuất hiện trong response — chỉ có cờ `has_api_key`.

### GET `/api/sub2api/servers`
Liệt kê các Sub2API server.

### POST `/api/sub2api/servers`
Thêm server mới. Phải có **email + password** *hoặc* **api_key**.
```json
{
  "name": "Sub2API VN",
  "base_url": "https://sub2api.example.com",
  "email": "admin@example.com",
  "password": "...",
  "api_key": "",
  "group_id": ""
}
```

### POST `/api/sub2api/servers/{server_id}`
Cập nhật server (chỉ truyền field cần đổi).

### DELETE `/api/sub2api/servers/{server_id}`
Xoá server.

### GET `/api/sub2api/servers/{server_id}/groups`
Liệt kê các group có trên Sub2API server đó.

### GET `/api/sub2api/servers/{server_id}/accounts`
Liệt kê các account có thể import từ Sub2API server.

### POST `/api/sub2api/servers/{server_id}/import`
Bắt đầu import account từ Sub2API server.
```json
{ "account_ids": ["acc1", "acc2"] }
```

### GET `/api/sub2api/servers/{server_id}/import`
Lấy tiến độ import hiện tại.

---

## Mã lỗi HTTP

| Code | Ý nghĩa |
|------|---------|
| `400` | Request không hợp lệ (thiếu field, sai định dạng) |
| `401` | Chưa xác thực hoặc API key sai |
| `403` | Không đủ quyền (cần Admin) hoặc Pixelcut token hết hạn |
| `404` | Tài nguyên không tồn tại |
| `429` | Hết quota tạo ảnh |
| `502` | Lỗi kết nối tới API ngoài (OpenAI, Pixelcut...) |
| `503` | Tính năng chưa được cấu hình trên server |
