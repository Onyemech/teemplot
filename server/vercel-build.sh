#!/bin/bash
# Vercel Build Script for Backend

echo "🔨 Building Teemplot Backend for Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build TypeScript
echo "🏗️  Building TypeScript..."
npm run build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p dist/data

echo "✅ Build complete!"
