@echo off
chcp 65001 >nul 2>&1
setlocal

echo ========================================
echo  Cập nhật repo và việt hoá lại
echo ========================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [Lỗi] Không phải thư mục git.
  pause
  exit /b 1
)

git diff --quiet HEAD --
if errorlevel 1 (
  echo [Cảnh báo] Working tree đang có thay đổi chưa commit.
  echo Vui lòng commit hoặc stash trước khi chạy update.bat.
  pause
  exit /b 1
)

echo --- Fetch từ remote origin...
git fetch origin
if errorlevel 1 (
  echo [Lỗi] Không thể fetch từ remote.
  pause
  exit /b 1
)

echo --- Merge origin/main vào branch hiện tại...
git merge --no-edit origin/main
if errorlevel 1 (
  echo.
  echo [Lỗi] Merge gặp xung đột. Hãy giải quyết thủ công rồi chạy tiếp:
  echo   cd web
  echo   npm run i18n:apply
  echo   npm run i18n:scan
  pause
  exit /b 1
)

echo.
echo === Áp dụng dictionary dịch... ===
pushd web
call npm run i18n:apply
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo === Liệt kê string mới chưa có trong dictionary... ===
call npm run i18n:scan
popd

echo.
echo ========================================
echo Hoàn tất.
echo Nếu scan báo có string mới chưa dịch:
echo   1. Dịch tay trong code
echo   2. cd web ^&^& npm run i18n:extract
echo   3. git add . ^&^& git commit
echo ========================================
pause
endlocal
