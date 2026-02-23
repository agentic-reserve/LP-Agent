# HawkFi Platform Test Script (PowerShell)
# Tests all components to verify setup

Write-Host "🦅 HawkFi Platform Test Suite" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$PASSED = 0
$FAILED = 0

function Test-Command {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $null = & $Command 2>&1
        Write-Host "✓ PASS" -ForegroundColor Green
        $script:PASSED++
        return $true
    }
    catch {
        Write-Host "✗ FAIL" -ForegroundColor Red
        $script:FAILED++
        return $false
    }
}

function Test-FileExists {
    param([string]$Path)
    return Test-Path $Path
}

# 1. Prerequisites
Write-Host "📦 Checking Prerequisites" -ForegroundColor Yellow
Write-Host "-------------------------"
Test-Command "Node.js" { node --version }
Test-Command "npm" { npm --version }
Test-Command "Git" { git --version }
Write-Host ""

# 2. Project files
Write-Host "📁 Checking Project Files" -ForegroundColor Yellow
Write-Host "-------------------------"
if (Test-FileExists "package.json") {
    Write-Host "✓ package.json exists" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "✗ package.json missing" -ForegroundColor Red
    $FAILED++
}

if (Test-FileExists "tsconfig.json") {
    Write-Host "✓ tsconfig.json exists" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "✗ tsconfig.json missing" -ForegroundColor Red
    $FAILED++
}

if (Test-FileExists "vite.config.ts") {
    Write-Host "✓ vite.config.ts exists" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "✗ vite.config.ts missing" -ForegroundColor Red
    $FAILED++
}

if (Test-FileExists "railway.toml") {
    Write-Host "✓ railway.toml exists" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "✗ railway.toml missing" -ForegroundColor Red
    $FAILED++
}
Write-Host ""

# 3. Source files
Write-Host "📝 Checking Source Files" -ForegroundColor Yellow
Write-Host "------------------------"
$sourceFiles = @(
    "backend\server.ts",
    "backend\keeper.ts",
    "src\App.tsx",
    "src\main.tsx",
    "supabase\schema.sql"
)

foreach ($file in $sourceFiles) {
    if (Test-FileExists $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
        $FAILED++
    }
}
Write-Host ""

# 4. Documentation
Write-Host "📚 Checking Documentation" -ForegroundColor Yellow
Write-Host "-------------------------"
$docs = @(
    "README.md",
    "QUICK_START.md",
    "DEPLOY_NOW.md",
    "ARCHITECTURE.md"
)

foreach ($doc in $docs) {
    if (Test-FileExists $doc) {
        Write-Host "✓ $doc exists" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ $doc missing" -ForegroundColor Red
        $FAILED++
    }
}
Write-Host ""

# 5. Dependencies
Write-Host "📦 Checking Dependencies" -ForegroundColor Yellow
Write-Host "------------------------"
if (Test-FileExists "node_modules") {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "⚠ node_modules not found - run 'npm install'" -ForegroundColor Yellow
    $FAILED++
}
Write-Host ""

# 6. Environment
Write-Host "🔐 Checking Environment" -ForegroundColor Yellow
Write-Host "-----------------------"
if (Test-FileExists ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    $PASSED++
    
    $envContent = Get-Content .env -Raw
    
    if ($envContent -match "HELIUS_API_KEY") {
        Write-Host "✓ HELIUS_API_KEY configured" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ HELIUS_API_KEY missing" -ForegroundColor Red
        $FAILED++
    }
    
    if ($envContent -match "SUPABASE_URL") {
        Write-Host "✓ SUPABASE_URL configured" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ SUPABASE_URL missing" -ForegroundColor Red
        $FAILED++
    }
    
    if ($envContent -match "OPENROUTER_API_KEY") {
        Write-Host "✓ OPENROUTER_API_KEY configured" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ OPENROUTER_API_KEY missing" -ForegroundColor Red
        $FAILED++
    }
} else {
    Write-Host "✗ .env file not found - copy from .env.example" -ForegroundColor Red
    $FAILED++
}
Write-Host ""

# 7. Build test
Write-Host "🔨 Testing Build" -ForegroundColor Yellow
Write-Host "----------------"
try {
    $null = npm run build 2>&1
    Write-Host "✓ Build successful" -ForegroundColor Green
    $PASSED++
    
    if (Test-FileExists "dist\frontend") {
        Write-Host "✓ Frontend build output exists" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ Frontend build output missing" -ForegroundColor Red
        $FAILED++
    }
    
    if (Test-FileExists "dist\backend") {
        Write-Host "✓ Backend build output exists" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "✗ Backend build output missing" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ Build failed" -ForegroundColor Red
    $FAILED++
}
Write-Host ""

# 8. Optional tools
Write-Host "🛠️  Checking Optional Tools" -ForegroundColor Yellow
Write-Host "---------------------------"
try {
    $null = railway --version 2>&1
    Write-Host "✓ Railway CLI installed" -ForegroundColor Green
    $PASSED++
} catch {
    Write-Host "⚠ Railway CLI not installed (optional)" -ForegroundColor Yellow
}

try {
    $null = solana --version 2>&1
    Write-Host "✓ Solana CLI installed" -ForegroundColor Green
    $PASSED++
} catch {
    Write-Host "⚠ Solana CLI not installed (optional)" -ForegroundColor Yellow
}

try {
    $null = pnpm --version 2>&1
    Write-Host "✓ pnpm installed" -ForegroundColor Green
    $PASSED++
} catch {
    Write-Host "⚠ pnpm not installed (optional)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "✅ All tests passed! Ready to deploy." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. npm run dev          # Start development"
    Write-Host "2. railway up           # Deploy to Railway"
    Write-Host "3. See DEPLOY_NOW.md    # Full deployment guide"
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please fix issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:"
    Write-Host "1. npm install          # Install dependencies"
    Write-Host "2. Copy-Item .env.example .env  # Create environment file"
    Write-Host "3. Edit .env            # Add your API keys"
    exit 1
}
