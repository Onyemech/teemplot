#!/bin/bash

# Teemplot Environment Setup Script

echo "🚀 Teemplot Environment Setup"
echo "=============================="
echo ""

# Detect environment
if [ "$1" == "production" ] || [ "$1" == "prod" ]; then
    ENV="production"
    echo "📦 Setting up PRODUCTION environment"
elif [ "$1" == "development" ] || [ "$1" == "dev" ]; then
    ENV="development"
    echo "💻 Setting up DEVELOPMENT environment"
else
    echo "Usage: ./setup-env.sh [development|production]"
    exit 1
fi

echo ""

# Setup server environment
echo "🔧 Setting up server environment..."
if [ -f "server/.env.$ENV" ]; then
    cp "server/.env.$ENV" "server/.env"
    echo "✅ Server .env configured for $ENV"
else
    echo "❌ server/.env.$ENV not found"
    exit 1
fi

# Setup client environment
echo "🔧 Setting up client environment..."
if [ -f "client/.env.$ENV" ]; then
    cp "client/.env.$ENV" "client/.env"
    echo "✅ Client .env configured for $ENV"
else
    echo "❌ client/.env.$ENV not found"
    exit 1
fi

echo ""
echo "✨ Environment setup complete!"
echo ""
echo "Next steps:"
if [ "$ENV" == "development" ]; then
    echo "  1. Edit server/.env with your local values"
    echo "  2. Edit client/.env with your local values"
    echo "  3. Run: cd server && npm install && npm run dev"
    echo "  4. Run: cd client && npm install && npm run dev"
else
    echo "  1. Set environment variables in your deployment platform"
    echo "  2. Deploy backend: cd server && vercel --prod"
    echo "  3. Deploy frontend: cd client && vercel --prod"
fi
echo ""
