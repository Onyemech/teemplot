@echo off
echo 🧹 Cleaning up old files...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 📦 Installing dependencies...
call npm install

echo 🚀 Starting development server...
call npm run dev
