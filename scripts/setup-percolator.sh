#!/bin/bash
# Automated Percolator Setup Script

echo "🦅 HawkFi - Percolator Setup"
echo "============================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the LP_AGENT directory"
    exit 1
fi

# Navigate to parent directory
cd ..

# Check if Percolator already exists
if [ -d "percolator" ]; then
    echo "✅ Percolator repository already exists"
    cd percolator
    git pull origin main
    echo "✅ Updated to latest version"
else
    echo "📦 Cloning Percolator repository..."
    git clone https://github.com/aeyakovenko/percolator.git
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone Percolator repository"
        exit 1
    fi
    
    echo "✅ Percolator cloned successfully"
    cd percolator
fi

# Install CLI dependencies
echo ""
echo "📦 Installing Percolator CLI dependencies..."
cd percolator-cli

# Check if pnpm is installed
if command -v pnpm &> /dev/null; then
    echo "Using pnpm..."
    pnpm install
else
    echo "⚠️  pnpm not found, installing..."
    npm install -g pnpm
    pnpm install
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Test CLI
echo ""
echo "🧪 Testing Percolator CLI..."
npx tsx src/cli.ts --help > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Percolator CLI is working!"
else
    echo "❌ Percolator CLI test failed"
    exit 1
fi

# Return to LP_AGENT directory
cd ../../LP_AGENT

# Make helper script executable
chmod +x scripts/percolator.sh

echo ""
echo "=============================="
echo "✅ Percolator Setup Complete!"
echo "=============================="
echo ""
echo "You can now use Percolator CLI:"
echo ""
echo "  ./scripts/percolator.sh --help"
echo "  ./scripts/percolator.sh init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs"
echo ""
echo "Or navigate directly:"
echo "  cd ../percolator/percolator-cli"
echo "  npx tsx src/cli.ts --help"
echo ""
echo "Next steps:"
echo "  1. See PERCOLATOR_SETUP.md for detailed guide"
echo "  2. See PERCOLATOR_TEST.md for testing instructions"
echo ""
