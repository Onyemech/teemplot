#!/bin/bash

# API Consistency Verification Script
# Checks for API calls missing the /api prefix

echo "🔍 Checking for API consistency issues..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

issues_found=0

# Check for fetch calls without /api prefix
echo "📡 Checking fetch() calls..."
fetch_issues=$(grep -r "fetch(\`\${.*}/[a-z]" client/src --include="*.ts" --include="*.tsx" | grep -v "/api/" | grep -v "node_modules" | grep -v "//")

if [ -n "$fetch_issues" ]; then
  echo -e "${RED}❌ Found fetch() calls missing /api prefix:${NC}"
  echo "$fetch_issues"
  echo ""
  issues_found=$((issues_found + 1))
else
  echo -e "${GREEN}✅ All fetch() calls use /api prefix${NC}"
  echo ""
fi

# Check for axios calls without /api prefix
echo "📡 Checking axios calls..."
axios_issues=$(grep -r "axios\.\(get\|post\|put\|delete\|patch\)(\`\${.*}/[a-z]" client/src --include="*.ts" --include="*.tsx" | grep -v "/api/" | grep -v "node_modules" | grep -v "//")

if [ -n "$axios_issues" ]; then
  echo -e "${RED}❌ Found axios calls missing /api prefix:${NC}"
  echo "$axios_issues"
  echo ""
  issues_found=$((issues_found + 1))
else
  echo -e "${GREEN}✅ All axios calls use /api prefix${NC}"
  echo ""
fi

# Check for apiClient usage (recommended)
echo "📊 Checking apiClient usage..."
apiClient_count=$(grep -r "apiClient\." client/src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | wc -l)
fetch_count=$(grep -r "fetch(" client/src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | wc -l)
axios_direct_count=$(grep -r "axios\.\(get\|post\|put\|delete\|patch\)" client/src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "apiClient" | wc -l)

echo "  apiClient usage: $apiClient_count"
echo "  Direct fetch() calls: $fetch_count"
echo "  Direct axios calls: $axios_direct_count"
echo ""

if [ $fetch_count -gt 50 ] || [ $axios_direct_count -gt 10 ]; then
  echo -e "${YELLOW}⚠️  Consider migrating more calls to apiClient for consistency${NC}"
  echo ""
fi

# Check server route registration
echo "🖥️  Checking server route registration..."
server_routes=$(grep -r "app.register.*prefix.*api" server/src/app.ts | wc -l)

if [ $server_routes -gt 0 ]; then
  echo -e "${GREEN}✅ Server routes use /api prefix ($server_routes routes)${NC}"
  echo ""
else
  echo -e "${RED}❌ Server routes may not be using /api prefix${NC}"
  echo ""
  issues_found=$((issues_found + 1))
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $issues_found -eq 0 ]; then
  echo -e "${GREEN}✅ All API consistency checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Found $issues_found issue(s). Please fix them.${NC}"
  echo ""
  echo "📚 See API_STANDARDS.md for guidelines"
  echo "🛠️  Use client/src/utils/apiHelpers.ts for consistent API calls"
  exit 1
fi
