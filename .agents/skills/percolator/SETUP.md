# Percolator Setup Guide

## Overview

You now have two repositories:
- `percolator/` - Core risk engine library (Rust)
- `percolator-cli/` - CLI tool for interacting with Percolator on Solana (TypeScript)

## Prerequisites

1. **Node.js** (v20+) - for percolator-cli
2. **pnpm** - package manager
3. **Rust** - for percolator core
4. **Solana CLI** - for devnet testing
5. **Kani** (optional) - for formal verification

## Quick Start

### 1. Install percolator-cli

```bash
cd percolator-cli
pnpm install
pnpm build
```

### 2. Configure CLI

Create `~/.config/percolator-cli.json`:

```json
{
  "rpcUrl": "https://api.devnet.solana.com",
  "programId": "2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp",
  "walletPath": "~/.config/solana/id.json"
}
```

### 3. Get Devnet SOL

```bash
solana airdrop 2 --url devnet
```

### 4. Wrap SOL for Trading

```bash
spl-token wrap 1 --url devnet
```

### 5. Initialize Your Account

```bash
percolator-cli init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
```

## Test Market Details (Devnet)

- **Slab**: A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
- **Oracle**: 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR (Chainlink SOL/USD)
- **Type**: Inverted (price = 1/SOL in USD terms)
- **LP 0**: Passive matcher with 50bps spread
- **LP 4**: vAMM matcher with tighter spreads

## Common Commands

```bash
# Check best prices
percolator-cli best-price \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# Deposit collateral (50M lamports = 0.05 SOL)
percolator-cli deposit \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx <your-idx> \
  --amount 50000000

# Run keeper crank (required before trading)
percolator-cli keeper-crank \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# Trade (long 1000 units)
percolator-cli trade-cpi \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx <your-idx> \
  --lp-idx 0 \
  --size 1000 \
  --matcher-program 4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy \
  --matcher-ctx 5n3jT6iy9TK3XNMQarC1sK26zS8ofjLG3dvE9iDEFYhK \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

## Testing the Core Library

```bash
cd ../percolator
cargo test
cargo kani  # Formal verification (requires Kani)
```

## Important Notes

⚠️ **EDUCATIONAL ONLY** - Not audited, do not use with real funds
⚠️ **Keeper Crank** - Must run within 200 slots (~80s) before trading
⚠️ **Inverted Market** - Long = long USD (profit if SOL drops)

## Next Steps

1. Explore the test scripts in `percolator-cli/scripts/`
2. Run the random traders bot to see the system in action
3. Check out the stress tests to understand risk mechanics
4. Read the core library docs to understand the math
