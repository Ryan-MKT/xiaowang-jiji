@echo off
REM FM快速清除.bat - 快速清除 FLEX MESSAGE 快取的批次檔
REM 版本：V1.0 - 2025-09-13
REM 用法：在 V2_小汪記記 目錄中執行此批次檔

echo ========================================
echo 🚨 FM快速清除工具
echo ========================================
echo.

cd /d "%~dp0"
echo 📍 當前目錄: %CD%
echo.

echo 🚀 執行 FM清除快取.js...
node "FM清除快取.js"

echo.
echo ✨ 快取清除完成！
echo 💡 提示：請手動重新啟動伺服器以套用變更
echo 💡 指令：npm start
echo.
pause