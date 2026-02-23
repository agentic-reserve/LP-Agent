#!/bin/bash

# HawkFi Platform Test Script
# Tests all components to verify setup

echo "🦅 HawkFi Platform Test Suite"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_command() {
    local name=$1
    local command=$2
    
    echo -n "Testing $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. Node.js and npm
echo "📦 Checking Prerequisites"
echo "-------------------------"
test_command "Node.js" "node --version"
test_command "npm" "npm --version"
test_command "Git" "git --version"
echo ""

# 2. Project files
echo "📁 Checking Project Files"
echo "-------------------------"
test_command "package.json" "test -f package.json"
test_command "tsconfig.json" "test -f tsconfig.json"
test_command "vite.config.ts" "test -f vite.config.ts"
test_command "railway.toml" "test -f railway.toml"
test_command ".env.example" "test -f .env.example"
echo ""

# 3. Source files
echo "📝 Checking Source Files"
echo "------------------------"
test_command "backend/server.ts" "test -f backend/server.ts"
test_command "backend/keeper.ts" "test -f backend/keeper.ts"
test_command "src/App.tsx" "test -f src/App.tsx"
test_command "src/main.tsx" "test -f src/main.tsx"
test_command "supabase/schema.sql" "test -f supabase/schema.sql"
echo ""

# 4. Documentation
echo "📚 Checking Documentation"
echo "-------------------------"
test_command "README.md" "test -f README.md"
test_command "QUICK_START.md" "test -f QUICK_START.md"
test_command "DEPLOY_NOW.md" "test -f DEPLOY_NOW.md"
test_command "ARCHITECTURE.md" "test -f ARCHITECTURE.md"
echo ""

# 5. Dependencies
echo "📦 Checking Dependencies"
echo "------------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules exists${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ node_modules not found - run 'npm install'${NC}"
    ((FAILED++))
fi
echo ""

# 6. Environment variables
echo "🔐 Checking Environment"
echo "-----------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    ((PASSED++))
    
    # Check required variables
    if grep -q "HELIUS_API_KEY" .env; then
        echo -e "${GREEN}✓ HELIUS_API_KEY configured${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ HELIUS_API_KEY missing${NC}"
        ((FAILED++))
    fi
    
    if grep -q "SUPABASE_URL" .env; then
        echo -e "${GREEN}✓ SUPABASE_URL configured${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ SUPABASE_URL missing${NC}"
        ((FAILED++))
    fi
    
    if grep -q "OPENROUTER_API_KEY" .env; then
        echo -e "${GREEN}✓ OPENROUTER_API_KEY configured${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ OPENROUTER_API_KEY missing${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ .env file not found - copy from .env.example${NC}"
    ((FAILED++))
fi
echo ""

# 7. Build test
echo "🔨 Testing Build"
echo "----------------"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
    ((PASSED++))
    
    # Check build output
    if [ -d "dist/frontend" ]; then
        echo -e "${GREEN}✓ Frontend build output exists${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Frontend build output missing${NC}"
        ((FAILED++))
    fi
    
    if [ -d "dist/backend" ]; then
        echo -e "${GREEN}✓ Backend build output exists${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Backend build output missing${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ Build failed${NC}"
    ((FAILED++))
fi
echo ""

# 8. Optional tools
echo "🛠️  Checking Optional Tools"
echo "---------------------------"
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓ Railway CLI installed${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Railway CLI not installed (optional)${NC}"
fi

if command -v solana &> /dev/null; then
    echo -e "${GREEN}✓ Solana CLI installed${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Solana CLI not installed (optional)${NC}"
fi

if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}✓ pnpm installed${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ pnpm not installed (optional)${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Test Summary"
echo "=============================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. npm run dev          # Start development"
    echo "2. railway up           # Deploy to Railway"
    echo "3. See DEPLOY_NOW.md    # Full deployment guide"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. npm install          # Install dependencies"
    echo "2. cp .env.example .env # Create environment file"
    echo "3. Edit .env            # Add your API keys"
    exit 1
fi
