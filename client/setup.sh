#!/bin/bash

echo "🧹 Cleaning up old files..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting development server..."
npm run dev
