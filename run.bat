@echo off
chcp 65001 >nul 2>&1
setlocal

REM --- Nạp cấu hình host/port từ run.config.bat ---
if not exist "%~dp0run.config.bat" (
  echo [Lỗi] Không tìm thấy "run.config.bat" cạnh "run.bat".
  pause
  exit /b 1
)
call "%~dp0run.config.bat"

REM --- Đặt giá trị mặc định nếu config thiếu biến ---
if not defined BACKEND_HOST  set "BACKEND_HOST=127.0.0.1"
if not defined BACKEND_PORT  set "BACKEND_PORT=8000"
if not defined FRONTEND_PORT set "FRONTEND_PORT=3010"

echo ========================================
echo  Khởi động ChatGPT2API
echo  Backend  : %BACKEND_HOST%:%BACKEND_PORT%
echo  Frontend : 0.0.0.0:%FRONTEND_PORT%
echo ========================================
echo.

REM --- Kiểm tra môi trường cơ bản ---
where uv >nul 2>&1
if errorlevel 1 (
  echo [Lỗi] Không tìm thấy lệnh "uv". Hãy cài đặt uv trước:
  echo   https://docs.astral.sh/uv/getting-started/installation/
  pause
  exit /b 1
)

if not exist "web\package.json" (
  echo [Lỗi] Không tìm thấy "web\package.json". Bạn có đang ở thư mục gốc dự án?
  pause
  exit /b 1
)

if not exist "web\node_modules" (
  echo --- Chưa cài dependencies cho frontend, đang chạy "npm install" ...
  pushd web
  call npm install
  if errorlevel 1 (
    popd
    echo [Lỗi] Cài đặt dependencies frontend thất bại.
    pause
    exit /b 1
  )
  popd
)

echo --- Đồng bộ dependencies Python (uv sync) ...
call uv sync
if errorlevel 1 (
  echo [Lỗi] uv sync thất bại.
  pause
  exit /b 1
)

echo.
echo --- Khởi động Backend (FastAPI / uvicorn) ...
start "ChatGPT2API - Backend" cmd /k "chcp 65001 >nul & uv run python -m uvicorn main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --no-access-log"

echo --- Khởi động Frontend (Next.js dev) ...
start "ChatGPT2API - Frontend" cmd /k "chcp 65001 >nul & cd /d %~dp0web & npm run dev -- -p %FRONTEND_PORT%"

echo.
echo ========================================
echo  Đã mở 2 cửa sổ chạy song song:
echo   - Backend  : http://localhost:%BACKEND_PORT%
echo   - Frontend : http://localhost:%FRONTEND_PORT%
echo.
echo  Đóng cửa sổ tương ứng để dừng từng phần.
echo  Đổi port: chỉnh trong file run.config.bat
echo ========================================
echo.
endlocal
