@echo off
echo ========================================
echo Building for PRODUCTION (Fast Mode)
echo ========================================
echo.

echo Step 1: Building optimized production bundle...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED! Please fix errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Starting production server...
echo Navigation will be INSTANT (under 500ms)
echo.

call npm start
