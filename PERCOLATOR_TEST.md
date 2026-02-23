# 🧪 Test Percolator on Devnet - Complete Guide

## Prerequisites

- [ ] Solana CLI installed
- [ ] Phantom or Solflare wallet
- [ ] Devnet SOL (from faucet)
- [ ] Node.js 18+

## Step 1: Setup Solana CLI (5 minutes)

### 1.1 Install Solana CLI
```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Windows (PowerShell)
# Download from https://github.com/solana-labs/solana/releases

# Verify installation
solana --version
```

### 1.2 Configure for Devnet
```bash
# Set to devnet
solana config set --url devnet

# Create keypair (if needed)
solana-keygen new --outfile ~/.config/solana/devnet.json

# Set as default
solana config set --keypair ~/.config/solana/devnet.json

# Check config
solana config get
```

### 1.3 Get Devnet SOL
```bash
# Airdrop 2 SOL
solana airdrop 2

# Check balance
solana balance

# If airdrop fails, use web faucet:
# https://faucet.solana.com
```

## Step 2: Install Percolator CLI (5 minutes)

### 2.1 Clone Percolator (if not already)
```bash
# Clone repository
git clone https://github.com/aeyakovenko/percolator.git
cd percolator/percolator-cli

# Or if already in your project:
cd .agents/skills/percolator
```

### 2.2 Install Dependencies
```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Build CLI
pnpm build

# Verify installation
npx percolator-cli --help
```

## Step 3: Wrap SOL for Trading (2 minutes)

Percolator uses Wrapped SOL (wSOL) as collateral.

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Wrap 1 SOL
spl-token wrap 1 --url devnet

# Check wrapped balance
spl-token balance So11111111111111111111111111111111111111112 --url devnet

# Should show: 1 SOL
```

## Step 4: Initialize Percolator User (3 minutes)

### 4.1 Devnet Market Info
```bash
# Save these for easy access
export SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
export ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
export MATCHER_PROG=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
```

### 4.2 Create User Account
```bash
# Initialize user
npx percolator-cli init-user --slab $SLAB

# Output will show your user index, e.g.:
# ✅ User initialized at index: 42

# Save your user index
export USER_IDX=42  # Replace with your actual index
```

### 4.3 Deposit Collateral
```bash
# Deposit 0.1 SOL (100,000,000 lamports)
npx percolator-cli deposit \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --amount 100000000

# Verify deposit
npx percolator-cli slab:get --slab $SLAB | grep -A 10 "Account $USER_IDX"
```

## Step 5: Check Market Prices (2 minutes)

### 5.1 Get Current Price
```bash
# Check best bid/ask
npx percolator-cli best-price \
  --slab $SLAB \
  --oracle $ORACLE

# Output shows:
# Oracle Price: 123.45 USD/SOL
# Best Bid: 123.40
# Best Ask: 123.50
# Spread: 0.10 (0.08%)
```

### 5.2 View Market State
```bash
# Full market dump
npx tsx scripts/dump-state.ts

# Shows:
# - Coverage ratio (h)
# - Total positions
# - Insurance fund
# - Funding rate
```

## Step 6: Execute Your First Trade (5 minutes)

### 6.1 Run Keeper Crank (Required!)
```bash
# IMPORTANT: Must run keeper before trading
npx percolator-cli keeper-crank \
  --slab $SLAB \
  --oracle $ORACLE

# Output:
# ✅ Keeper crank completed
# Step: 0 (mark price updated)
```

### 6.2 Execute Trade
```bash
# Trade with LP 0 (passive matcher, 50bps spread)
export LP_IDX=0

# Get matcher context
export MATCHER_CTX=$(npx tsx scripts/get-matcher-ctx.ts $SLAB $LP_IDX)

# Long 1000 units (positive = long USD in inverted market)
npx percolator-cli trade-cpi \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --lp-idx $LP_IDX \
  --size 1000 \
  --matcher-program $MATCHER_PROG \
  --matcher-ctx $MATCHER_CTX \
  --oracle $ORACLE

# Output:
# ✅ Trade executed
# Size: 1000
# Price: 123.45
# Fee: 0.12 SOL
```

### 6.3 Verify Position
```bash
# Check your position
npx percolator-cli slab:get --slab $SLAB | grep -A 15 "Account $USER_IDX"

# Should show:
# Position: 1000
# Entry Price: 123.45
# Capital: 0.1 SOL
# PnL: 0 (just opened)
```

## Step 7: Monitor Position (Ongoing)

### 7.1 Check PnL
```bash
# Calculate current PnL
npx tsx scripts/check-pnl.ts $SLAB $USER_IDX

# Output:
# Position: 1000
# Entry: 123.45
# Mark: 124.00
# Unrealized PnL: +0.0055 SOL (+5.5%)
```

### 7.2 Check Liquidation Risk
```bash
# Check if position at risk
npx tsx scripts/check-liquidation.ts

# Output:
# User 42: SAFE
# Margin: 15% (required: 5%)
# Distance to liquidation: 10%
```

### 7.3 Monitor Coverage Ratio
```bash
# Check global coverage ratio
npx tsx scripts/dump-state.ts | grep "Coverage"

# Output:
# Coverage Ratio (h): 1.0000 (100%)
# Status: Fully backed
```

## Step 8: Close Position (5 minutes)

### 8.1 Run Keeper Again
```bash
# Always run keeper before trading
npx percolator-cli keeper-crank \
  --slab $SLAB \
  --oracle $ORACLE
```

### 8.2 Close Position
```bash
# Close by trading opposite direction
# If you're long 1000, trade -1000 to close
npx percolator-cli trade-cpi \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --lp-idx $LP_IDX \
  --size -1000 \
  --matcher-program $MATCHER_PROG \
  --matcher-ctx $MATCHER_CTX \
  --oracle $ORACLE

# Output:
# ✅ Trade executed
# Position closed
# Realized PnL: +0.0055 SOL
```

### 8.3 Withdraw Profits
```bash
# Check withdrawable amount
npx tsx scripts/check-withdrawable.ts $SLAB $USER_IDX

# Withdraw capital + profits
npx percolator-cli withdraw \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --amount 100000000  # Or specific amount

# Note: Profits may be haircut if h < 1.0
```

## Step 9: Advanced Testing

### 9.1 Test with vAMM Matcher
```bash
# Use LP 4 (vAMM with dynamic pricing)
export LP_IDX=4
export MATCHER_CTX=$(npx tsx scripts/get-matcher-ctx.ts $SLAB $LP_IDX)

# Trade with vAMM
npx percolator-cli trade-cpi \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --lp-idx $LP_IDX \
  --size 500 \
  --matcher-program $MATCHER_PROG \
  --matcher-ctx $MATCHER_CTX \
  --oracle $ORACLE

# vAMM has dynamic spread based on inventory
```

### 9.2 Test Funding Rate
```bash
# Check current funding rate
npx tsx scripts/check-funding.ts

# Output:
# Net OI: +10000 (more longs)
# Premium: 50 bps
# Funding per slot: 0.007 bps
# Longs pay, shorts receive
```

### 9.3 Stress Test
```bash
# Run random trading simulation
npx tsx scripts/random-traders.ts

# Simulates multiple traders
# Tests liquidations, funding, coverage ratio
```

## Step 10: Integration with HawkFi

### 10.1 Save Percolator Config
Add to your `.env`:
```bash
# Percolator Devnet
PERCOLATOR_SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
PERCOLATOR_PROGRAM=2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
PERCOLATOR_MATCHER=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
PERCOLATOR_ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
PERCOLATOR_USER_IDX=42  # Your user index
```

### 10.2 Test API Integration
```bash
# Test from your HawkFi backend
curl http://localhost:3001/api/percolator/position/$USER_IDX

# Should return position data
```

## Common Issues & Solutions

### Issue: "Insufficient SOL"
```bash
# Solution: Get more devnet SOL
solana airdrop 2

# Or use web faucet
open https://faucet.solana.com
```

### Issue: "Stale Keeper Crank"
```bash
# Solution: Run keeper before trading
npx percolator-cli keeper-crank --slab $SLAB --oracle $ORACLE

# Keeper must be run within 200 slots (~80s)
```

### Issue: "Insufficient Margin"
```bash
# Solution: Deposit more collateral
npx percolator-cli deposit \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --amount 50000000  # 0.05 SOL more
```

### Issue: "Position Liquidatable"
```bash
# Solution: Close position or add margin
# Check liquidation price:
npx tsx scripts/check-liquidation.ts

# Close position:
npx percolator-cli trade-cpi --size <opposite_of_current>
```

### Issue: "Coverage Ratio Low (h < 1.0)"
```bash
# This is normal during market stress
# Profits will be haircut on withdrawal
# System self-heals as conditions improve

# Check current h:
npx tsx scripts/dump-state.ts | grep Coverage

# Wait for h to recover before withdrawing profits
```

## Understanding Inverted Markets

⚠️ **IMPORTANT**: The devnet market is INVERTED

```
Normal Market (SOL/USD):
- Long = profit if SOL goes UP
- Short = profit if SOL goes DOWN

Inverted Market (USD/SOL with SOL collateral):
- Long = long USD = profit if SOL goes DOWN
- Short = short USD = profit if SOL goes UP
```

Example:
```bash
# SOL price: $100
# You go LONG 1000 units

# SOL drops to $90:
# Your position PROFITS (you're long USD)

# SOL rises to $110:
# Your position LOSES (you're long USD)
```

## Testing Checklist

- [ ] Solana CLI configured for devnet
- [ ] Devnet SOL obtained
- [ ] SOL wrapped to wSOL
- [ ] Percolator user initialized
- [ ] Collateral deposited
- [ ] Keeper crank executed
- [ ] First trade executed successfully
- [ ] Position visible in slab
- [ ] PnL calculated correctly
- [ ] Position closed successfully
- [ ] Profits withdrawn
- [ ] Coverage ratio monitored
- [ ] Integration with HawkFi tested

## Next Steps

1. ✅ Tested Percolator on devnet
2. → Integrate perp positions into HawkFi dashboard
3. → Implement delta-neutral strategies
4. → Monitor combined LP + perp metrics

## Resources

- Percolator Docs: `.agents/skills/percolator/`
- Devnet Explorer: https://explorer.solana.com/?cluster=devnet
- Percolator Paper: https://arxiv.org/abs/2512.01112
- Solana Faucet: https://faucet.solana.com

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**
- Percolator is NOT audited
- NOT production ready
- Use devnet only
- Do NOT use with real funds

---

**Percolator Devnet Testing Complete! Ready for HawkFi Integration 🦅**
