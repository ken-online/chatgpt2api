<h1 align="center">ChatGPT2API</h1>

<p align="center">
  Nền tảng tạo & chỉnh sửa ảnh AI thông qua ChatGPT, cung cấp API tương thích OpenAI, bảng điều khiển trực tuyến và quản lý tài khoản.
</p>

<p align="center">
  <a href="#-tính-năng">Tính năng</a> •
  <a href="#-cài-đặt">Cài đặt</a> •
  <a href="#-api">API</a> •
  <a href="#-cấu-hình">Cấu hình</a>
</p>

---

> [!WARNING]
> **Tuyên bố miễn trừ trách nhiệm**
>
> Dự án này được xây dựng dựa trên nghiên cứu kỹ thuật đảo ngược các API tạo ảnh, chỉnh sửa ảnh của ChatGPT. Chỉ dùng cho mục đích học tập, nghiên cứu và trao đổi kỹ thuật phi thương mại.
>
> - Nghiêm cấm sử dụng cho mục đích thương mại, tự động hóa quy mô lớn, bán lại dịch vụ.
> - Nghiêm cấm tạo, phát tán nội dung vi phạm pháp luật, bạo lực, khiêu dâm.
> - Người dùng tự chịu toàn bộ rủi ro, bao gồm việc tài khoản bị hạn chế hoặc khóa vĩnh viễn.

> [!IMPORTANT]
> Không sử dụng tài khoản cá nhân quan trọng hoặc tài khoản có giá trị cao để test.

---

## ✨ Tính năng

### Bảng điều khiển tạo ảnh

- **Giao diện SubKey** — giao diện hiện đại, hỗ trợ chuyển đổi **Dark / Light mode**
- **Tạo ảnh từ văn bản** — nhập mô tả, chọn model và kích thước, nhận ảnh ngay
- **Chỉnh sửa ảnh có tham chiếu** — upload ảnh gốc làm tham chiếu, mô tả thay đổi cần thực hiện
- **Lịch sử phiên bản** — mỗi lần nhấn "Tạo lại" tự động lưu phiên bản cũ; dùng nút mũi tên ◀ ▶ trên ảnh để xem lại các phiên bản trước mà không mất ảnh hiện tại
- **Xem lại trong lúc đang tạo** — có thể xem lại phiên bản cũ ngay cả khi phiên bản mới vẫn đang được tạo
- **Xóa nền ảnh (Pixelcut)** — tích hợp Pixelcut AI để xóa nền; ảnh đã xóa nền được lưu xuống đĩa và hiển thị ngay bên cạnh ảnh gốc với nền ô bàn cờ
- **Lightbox xem ảnh lớn** — click vào ảnh để xem toàn màn hình; hỗ trợ:
  - Zoom bằng chuột (double click / scroll)
  - Pinch-to-zoom và vuốt trái/phải trên mobile
  - Điều hướng phiên bản ngay trong lightbox
- **Tải ảnh xuống** — tải ảnh gốc hoặc ảnh đã xóa nền về máy trực tiếp (hỗ trợ cả data URL và server URL)
- **Lưu hội thoại** — toàn bộ lịch sử hội thoại, ảnh và phiên bản được lưu cục bộ (IndexedDB), tự động phục hồi sau khi reload trang
- **Sidebar quản lý hội thoại** — danh sách hội thoại với màu nền theo trạng thái (đang chạy / chờ / đang chọn)
- **Ảnh tham chiếu trong tin nhắn** — ảnh tham chiếu hiển thị trực tiếp trong bubble tin nhắn, click để xem to, có nút "Sửa từ ảnh này"

### API tương thích OpenAI

- `POST /v1/images/generations` — tạo ảnh từ văn bản
- `POST /v1/images/edits` — chỉnh sửa ảnh từ file upload
- `POST /v1/chat/completions` — chat completions cho tình huống tạo ảnh
- `POST /v1/responses` — Responses API cho tình huống tạo ảnh
- `GET /v1/models` — danh sách model hỗ trợ
- Hỗ trợ `n` để nhận nhiều ảnh cùng lúc

**Model hỗ trợ:** `gpt-image-2`, `codex-gpt-image-2`, `auto`, `gpt-5`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3`, `gpt-5-3-mini`, `gpt-5-mini`

> `codex-gpt-image-2` sử dụng hạn mức Codex riêng biệt, chỉ dùng được với tài khoản Plus / Team / Pro.

### Quản lý tài khoản (Số pool)

- Tự động làm mới email, loại tài khoản, hạn mức và thời gian phục hồi
- Luân phiên tài khoản khả dụng để thực hiện tạo và chỉnh sửa ảnh
- Tự động loại tài khoản khi token hết hạn hoặc bị giới hạn tốc độ
- Hỗ trợ tìm kiếm, lọc, làm mới hàng loạt, xuất file, sửa thủ công
- Cấu hình proxy toàn cục (HTTP / HTTPS / SOCKS5 / SOCKS5H) từ giao diện web
- **4 phương thức nhập tài khoản:**
  - File CPA JSON cục bộ
  - CPA server từ xa
  - `sub2api` server
  - `access_token` trực tiếp

### Lưu trữ & Cấu hình

- Hỗ trợ chuyển đổi backend lưu trữ: `json` (mặc định), `sqlite`, `postgres`, `git`
- Cấu hình backup tự động lên Cloudflare R2
- Lưu ảnh tạo ra xuống đĩa theo cấu trúc `images/YYYY/MM/DD/`
- Cấu hình toàn bộ từ giao diện Settings mà không cần chỉnh file

---

## 🚀 Cài đặt

### Chạy bằng Docker (Khuyến nghị)

```bash
git clone https://github.com/ken-online/chatgpt2api-v2.git
cd chatgpt2api-v2
docker compose up -d
```

Trước khi chạy, đặt `auth-key` trong `config.json` hoặc override qua biến môi trường `CHATGPT2API_AUTH_KEY` trong `docker-compose.yml`.

| Địa chỉ | URL |
|---|---|
| Bảng điều khiển web | `http://localhost:3000` |
| Endpoint API | `http://localhost:3000/v1` |
| Thư mục dữ liệu | `./data` |

### Phát triển cục bộ (Windows)

Chạy backend:

```bash
uv sync
uv run main.py
```

Hoặc dùng `run.bat` đã có sẵn.

Chạy frontend:

```bash
cd web
bun install
bun run dev
```

Build frontend ra thư mục tĩnh:

```bash
rebuild.bat
```

### Cấu hình backend lưu trữ

Thiết lập qua biến môi trường `STORAGE_BACKEND`:

| Giá trị | Mô tả |
|---|---|
| `json` | File JSON cục bộ (mặc định) |
| `sqlite` | SQLite cục bộ |
| `postgres` | PostgreSQL (cần `DATABASE_URL`) |
| `git` | Git repo riêng tư (cần `GIT_REPO_URL` và `GIT_TOKEN`) |

Ví dụ dùng PostgreSQL:

```yaml
environment:
  - STORAGE_BACKEND=postgres
  - DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## ⚙️ Cấu hình

File `config.json`:

```json
{
  "auth-key": "mật-khẩu-đăng-nhập",
  "refresh_account_interval_minute": 60,
  "image_retention_days": 15,
  "image_poll_timeout_secs": 120,
  "proxy": "",
  "base_url": "",
  "image_account_concurrency": 3
}
```

| Trường | Mô tả |
|---|---|
| `auth-key` | Mật khẩu đăng nhập bảng điều khiển |
| `refresh_account_interval_minute` | Chu kỳ tự động làm mới tài khoản (phút) |
| `image_retention_days` | Số ngày giữ ảnh trên đĩa trước khi xóa |
| `image_poll_timeout_secs` | Thời gian chờ tối đa khi tạo ảnh (giây) |
| `proxy` | Proxy toàn cục (để trống nếu không dùng) |
| `image_account_concurrency` | Số tài khoản chạy song song khi tạo ảnh |

---

## 📡 API

Tất cả request cần header xác thực:

```http
Authorization: Bearer <auth-key>
```

<details>
<summary><code>GET /v1/models</code> — Danh sách model</summary>
<br>

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer <auth-key>"
```

</details>

<details>
<summary><code>POST /v1/images/generations</code> — Tạo ảnh từ văn bản</summary>
<br>

```bash
curl http://localhost:3000/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "một chú mèo trôi nổi trong vũ trụ",
    "n": 1,
    "size": "1024x1024",
    "response_format": "b64_json"
  }'
```

| Trường | Mô tả |
|---|---|
| `model` | Model tạo ảnh, xem `/v1/models` |
| `prompt` | Mô tả ảnh cần tạo |
| `n` | Số lượng ảnh (1–4) |
| `size` | Kích thước ảnh |
| `response_format` | `b64_json` hoặc `url` |

</details>

<details>
<summary><code>POST /v1/images/edits</code> — Chỉnh sửa ảnh</summary>
<br>

```bash
curl http://localhost:3000/v1/images/edits \
  -H "Authorization: Bearer <auth-key>" \
  -F "model=gpt-image-2" \
  -F "prompt=chuyển sang phong cách cyberpunk về đêm" \
  -F "n=1" \
  -F "image=@./input.png"
```

| Trường | Mô tả |
|---|---|
| `model` | Model tạo ảnh |
| `prompt` | Mô tả chỉnh sửa |
| `n` | Số lượng ảnh (1–4) |
| `image` | File ảnh gốc (multipart/form-data) |

</details>

<details>
<summary><code>POST /v1/chat/completions</code> — Chat Completions</summary>
<br>

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-image-2",
    "messages": [
      { "role": "user", "content": "tạo ảnh mèo cyberpunk trên phố Tokyo đêm mưa" }
    ],
    "n": 1
  }'
```

</details>

<details>
<summary><code>POST /v1/responses</code> — Responses API</summary>
<br>

```bash
curl http://localhost:3000/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "gpt-5",
    "input": "tạo ảnh đường chân trời thành phố tương lai",
    "tools": [{ "type": "image_generation" }]
  }'
```

</details>

---

## 📬 Liên hệ

**Telegram:** [https://t.me/ken_online](https://t.me/ken_online)

**Copyright © Ken Hoàng**
