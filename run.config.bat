@echo off
REM ============================================================
REM  Cấu hình port chạy ChatGPT2API (dùng cho run.bat)
REM  Sửa các giá trị bên dưới để đổi host/port mà không cần
REM  chạm vào run.bat hay package.json.
REM ============================================================

REM --- Backend (FastAPI / uvicorn) ---
set "BACKEND_HOST=127.0.0.1"
set "BACKEND_PORT=8000"

REM --- Frontend (Next.js dev) ---
REM  Mặc định 3010 vì port 3000 thường bị Grafana / dịch vụ khác chiếm.
set "FRONTEND_PORT=8800"
