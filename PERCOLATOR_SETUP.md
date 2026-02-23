# Percolator Setup Guide - Quick Fix

## Issue

The `percolator-cli` is not available on npm. You need to clone the repository first.

## Quick Setup (5 minutes)

### Step 1: Clone Percolator Repository

```bash
# Navigate to a parent directory (outside your project)
cd ..

# Clone Percolator
git clone https://github.com/aeyakovenko/percolator.git

# Navigate to CLI
cd percolator/percolator-cli

# Install dependencies
pnpm install
# Or if you don't have pnpm:
npm install -g pnpm
pnpm install
```

### Step 2: Verify Installation

```bash
# Test CLI
npx tsx src/cli.ts --help

# Should show:
# percolator-cli <command>
# Commands:
#   init-user
#   deposit
#   withdraw
#   trade-cpi
#   keeper-crank
#   slab:get
#   ...
```

### Step 3: Setup Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Percolator CLI alias
alias percolator-cli='npx tsx /path/to/percolator/percolator-cli/src/cli.ts'
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

## Alternative: Use Percolator from Your Project

If you want to keep Percolator within your HawkFi project:

### Option A: Git Submodule

```bash
# In your LP_AGENT directory
git submodule add https://github.com/aeyakovenko/percolator.git external/percolator

# Initialize and update
git submodule update --init --recursive

# Install CLI dependencies
cd external/percolator/percolator-cli
pnpm install
```

### Option B: Direct Clone

```bash
# In your LP_AGENT directory
mkdir -p external
cd external
git clone https://github.com/aeyakovenko/percolator.git

# Install CLI dependencies
cd percolator/percolator-cli
pnpm install
```

## Quick Test Commands

Once installed, test with these commands:

```bash
# Navigate to percolator-cli directory
cd percolator/percolator-cli

# Test help
npx tsx src/cli.ts --help

# Test devnet connection
npx tsx src/cli.ts slab:get --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs

# Should show market data
```

## For HawkFi Integration

Update your scripts to use the correct path:

### Create Helper Script

Create `scripts/percolator.sh` in your LP_AGENT directory:

```bash
#!/bin/bash
# Helper script to run Percolator CLI

PERCOLATOR_CLI_PATH="../percolator/percolator-cli"

if [ ! -d "$PERCOLATOR_CLI_PATH" ]; then
    echo "Error: Percolator CLI not found at $PERCOLATOR_CLI_PATH"
    echo "Please run: git clone https://github.com/aeyakovenko/percolator.git ../percolator"
    exit 1
fi

cd "$PERCOLATOR_CLI_PATH"
npx tsx src/cli.ts "$@"
```

Make it executable:
```bash
chmod +x scripts/percolator.sh
```

Use it:
```bash
./scripts/percolator.sh --help
./scripts/percolator.sh init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
```

## Recommended Directory Structure

```
Documents/
├── LP_AGENT/                    # Your HawkFi project
│   ├── backend/
│   ├── src/
│   ├── scripts/
│   │   └── percolator.sh       # Helper script
│   └── ...
│
└── percolator/                  # Percolator repository
    ├── percolator/              # Core Rust library
    ├── percolator-cli/          # CLI tool (use this)
    ├── percolator-prog/         # Solana program
    └── percolator-match/        # Matcher programs
```

## Quick Commands Reference

```bash
# From LP_AGENT directory:

# Option 1: Use relative path
cd ../percolator/percolator-cli
npx tsx src/cli.ts --help

# Option 2: Use helper script
./scripts/percolator.sh --help

# Option 3: Use full path
npx tsx ../percolator/percolator-cli/src/cli.ts --help
```

## Environment Variables

Add to your `.env`:

```bash
# Percolator CLI Path
PERCOLATOR_CLI_PATH=../percolator/percolator-cli

# Devnet Market
PERCOLATOR_SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
PERCOLATOR_ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
PERCOLATOR_PROGRAM=2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
PERCOLATOR_MATCHER=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
```

## Troubleshooting

### Issue: `pnpm: command not found`

```bash
# Install pnpm
npm install -g pnpm

# Verify
pnpm --version
```

### Issue: `tsx: command not found`

```bash
# Install tsx globally
npm install -g tsx

# Or use npx (no install needed)
npx tsx src/cli.ts --help
```

### Issue: TypeScript errors

```bash
# Install dependencies
cd percolator/percolator-cli
pnpm install

# Build
pnpm build
```

### Issue: Solana connection errors

```bash
# Check Solana CLI
solana --version

# Configure for devnet
solana config set --url devnet

# Test connection
solana cluster-version
```

## Next Steps

Once Percolator CLI is working:

1. ✅ Follow `PERCOLATOR_TEST.md` for testing
2. ✅ Initialize user account
3. ✅ Execute test trades
4. ✅ Integrate with HawkFi backend

## Quick Start After Setup

```bash
# 1. Navigate to Percolator CLI
cd ../percolator/percolator-cli

# 2. Set environment variables
export SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
export ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# 3. Initialize user
npx tsx src/cli.ts init-user --slab $SLAB

# 4. Deposit collateral
npx tsx src/cli.ts deposit --slab $SLAB --user-idx 0 --amount 100000000

# 5. Check position
npx tsx src/cli.ts slab:get --slab $SLAB
```

---

**Percolator CLI Setup Complete! 🦅**
