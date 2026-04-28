@echo off
echo 🚀 Starting WorkTrack Local Server...
echo 📱 This enables per-device GitHub CLI integration
echo.

REM Check if Bun is available
where bun >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ Using Bun to start server...
    bun run index.ts
    goto :end
)

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ Using Node.js to start server...
    node index.ts
    goto :end
)

echo ❌ Neither Bun nor Node.js found. Please install one of them.
pause
exit /b 1

:end
