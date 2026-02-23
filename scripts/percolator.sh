#!/bin/bash
# Percolator CLI Helper Script for HawkFi

# Determine Percolator CLI path
PERCOLATOR_CLI_PATH="${PERCOLATOR_CLI_PATH:-../percolator/percolator-cli}"

# Check if Percolator CLI exists
if [ ! -d "$PERCOLATOR_CLI_PATH" ]; then
    echo "❌ Error: Percolator CLI not found at $PERCOLATOR_CLI_PATH"
    echo ""
    echo "Please install Percolator:"
    echo "  cd .."
    echo "  git clone https://github.com/aeyakovenko/percolator.git"
    echo "  cd percolator/percolator-cli"
    echo "  pnpm install"
    echo ""
    echo "Or set PERCOLATOR_CLI_PATH environment variable to the correct path."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "$PERCOLATOR_CLI_PATH/node_modules" ]; then
    echo "⚠️  Warning: Percolator CLI dependencies not installed"
    echo "Installing dependencies..."
    cd "$PERCOLATOR_CLI_PATH"
    pnpm install || npm install
    cd - > /dev/null
fi

# Run Percolator CLI
cd "$PERCOLATOR_CLI_PATH"
npx tsx src/cli.ts "$@"
