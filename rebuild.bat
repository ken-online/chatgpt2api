@echo off
chcp 65001 >/dev/null 2>&1
title Rebuild ChatGPT2API

echo ================================================
echo   Rebuild Docker Container - ChatGPT2API
echo ================================================
echo.

echo [1/3] Dừng và xóa container cũ...
docker compose -f docker-compose.local.yml down
if %errorlevel% neq 0 (
    echo LỖI: Không thể dừng container!
    pause
    exit /b 1
)

echo.
echo [2/3] Build lại image...
docker compose -f docker-compose.local.yml build
if %errorlevel% neq 0 (
    echo LỖI: Build thất bại!
    pause
    exit /b 1
)

echo.
echo [3/3] Khởi động container mới...
docker compose -f docker-compose.local.yml up -d
if %errorlevel% neq 0 (
    echo LỖI: Không thể khởi động container!
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Hoàn thành! Container đang chạy tại
echo   http://localhost:8668
echo ================================================
echo.
pause
