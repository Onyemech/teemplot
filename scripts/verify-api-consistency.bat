@echo off
REM API Consistency Verification Script for Windows
REM Checks for API calls missing the /api prefix

echo.
echo Checking for API consistency issues...
echo.

set issues_found=0

echo Checking fetch() calls...
findstr /S /R /C:"fetch(`${.*}/[a-z]" client\src\*.ts client\src\*.tsx 2>nul | findstr /V "/api/" >nul
if %errorlevel% equ 0 (
    echo [ERROR] Found fetch() calls missing /api prefix
    findstr /S /R /C:"fetch(`${.*}/[a-z]" client\src\*.ts client\src\*.tsx 2>nul | findstr /V "/api/"
    set /a issues_found+=1
) else (
    echo [OK] All fetch() calls use /api prefix
)
echo.

echo Checking axios calls...
findstr /S /R /C:"axios\.\(get\|post\|put\|delete\|patch\)(`${.*}/[a-z]" client\src\*.ts client\src\*.tsx 2>nul | findstr /V "/api/" >nul
if %errorlevel% equ 0 (
    echo [ERROR] Found axios calls missing /api prefix
    findstr /S /R /C:"axios\.\(get\|post\|put\|delete\|patch\)(`${.*}/[a-z]" client\src\*.ts client\src\*.tsx 2>nul | findstr /V "/api/"
    set /a issues_found+=1
) else (
    echo [OK] All axios calls use /api prefix
)
echo.

echo Checking server route registration...
findstr /C:"app.register" /C:"prefix" /C:"api" server\src\app.ts >nul
if %errorlevel% equ 0 (
    echo [OK] Server routes use /api prefix
) else (
    echo [ERROR] Server routes may not be using /api prefix
    set /a issues_found+=1
)
echo.

echo ========================================
if %issues_found% equ 0 (
    echo [SUCCESS] All API consistency checks passed!
    exit /b 0
) else (
    echo [FAILED] Found %issues_found% issue(s). Please fix them.
    echo.
    echo See API_STANDARDS.md for guidelines
    echo Use client/src/utils/apiHelpers.ts for consistent API calls
    exit /b 1
)
