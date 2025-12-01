@echo off
REM Teemplot Environment Setup Script for Windows

echo.
echo 🚀 Teemplot Environment Setup
echo ==============================
echo.

REM Detect environment
if "%1"=="production" goto production
if "%1"=="prod" goto production
if "%1"=="development" goto development
if "%1"=="dev" goto development

echo Usage: setup-env.bat [development^|production]
exit /b 1

:development
set ENV=development
echo 💻 Setting up DEVELOPMENT environment
goto setup

:production
set ENV=production
echo 📦 Setting up PRODUCTION environment
goto setup

:setup
echo.

REM Setup server environment
echo 🔧 Setting up server environment...
if exist "server\.env.%ENV%" (
    copy /Y "server\.env.%ENV%" "server\.env" >nul
    echo ✅ Server .env configured for %ENV%
) else (
    echo ❌ server\.env.%ENV% not found
    exit /b 1
)

REM Setup client environment
echo 🔧 Setting up client environment...
if exist "client\.env.%ENV%" (
    copy /Y "client\.env.%ENV%" "client\.env" >nul
    echo ✅ Client .env configured for %ENV%
) else (
    echo ❌ client\.env.%ENV% not found
    exit /b 1
)

echo.
echo ✨ Environment setup complete!
echo.
if "%ENV%"=="development" (
    echo Next steps:
    echo   1. Edit server\.env with your local values
    echo   2. Edit client\.env with your local values
    echo   3. Run: cd server ^&^& npm install ^&^& npm run dev
    echo   4. Run: cd client ^&^& npm install ^&^& npm run dev
) else (
    echo Next steps:
    echo   1. Set environment variables in your deployment platform
    echo   2. Deploy backend: cd server ^&^& vercel --prod
    echo   3. Deploy frontend: cd client ^&^& vercel --prod
)
echo.
