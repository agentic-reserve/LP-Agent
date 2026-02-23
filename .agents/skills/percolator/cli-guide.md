# Percolator CLI Guide

## Installation

```bash
cd percolator-cli
pnpm install
pnpm build
```

## Configuration

Create `~/.config/percolator-cli.json`:

```json
{
  "rpcUrl": "https://api.devnet.solana.com",
  "programId": "2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp",
  "walletPath": "~/.config/solana/id.json"
}
```

Or use command-line flags:
- `--rpc <url>` - Solana RPC endpoint
- `--program <pubkey>` - Percolator program ID
- `--wallet <path>` - Path to keypair file
- `--json` - Output in JSON format
- `--simulate` - Simulate transaction without sending

## User Operations

### Initialize User Account

Create a new trading account on the slab.

```bash
percolator-cli init-user --slab <slab-pubkey>
```

**Cost:** 0.001 SOL initialization fee

**Returns:** Your user account index

### Deposit Collateral

Add tokens to your trading account.

```bash
percolator-cli deposit \
  --slab <slab-pubkey> \
  --user-idx <your-index> \
  --amount <lamports>
```

**Example:** Deposit 0.05 SOL (50M lamports in 9 decimal format)
```bash
percolator-cli deposit \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx 5 \
  --amount 50000000
```

**Prerequisites:**
- Wrapped SOL token account with sufficient balance
- Use `spl-token wrap <amount>` to wrap SOL

### Check Best Prices

Scan all LPs to find the best execution prices.

```bash
percolator-cli best-price \
  --slab <slab-pubkey> \
  --oracle <oracle-pubkey>
```

**Output:**
- All LPs with their bid/ask quotes
- Best buy price (lowest ask)
- Best sell price (highest bid)
- Effective spread

**Example:**
```bash
percolator-cli best-price \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

### Trade (No CPI)

Execute a trade directly without matcher CPI.

```bash
percolator-cli trade-nocpi \
  --slab <slab-pubkey> \
  --user-idx <your-index> \
  --lp-idx <lp-index> \
  --size <i128> \
  --oracle <oracle-pubkey>
```

**Size:**
- Positive = long (buy)
- Negative = short (sell)

**Example:** Long 1000 units
```bash
percolator-cli trade-nocpi \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx 5 \
  --lp-idx 0 \
  --size 1000 \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

### Trade (With CPI)

Execute a trade via matcher program for dynamic pricing.

```bash
percolator-cli trade-cpi \
  --slab <slab-pubkey> \
  --user-idx <your-index> \
  --lp-idx <lp-index> \
  --size <i128> \
  --matcher-program <matcher-program-id> \
  --matcher-ctx <matcher-context-pubkey> \
  --oracle <oracle-pubkey>
```

**Example:** Trade via 50bps passive matcher
```bash
percolator-cli trade-cpi \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx 5 \
  --lp-idx 0 \
  --size 1000 \
  --matcher-program 4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy \
  --matcher-ctx 5n3jT6iy9TK3XNMQarC1sK26zS8ofjLG3dvE9iDEFYhK \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

**Important:** Run keeper crank within 200 slots (~80s) before trading!

### Withdraw Collateral

Remove tokens from your trading account.

```bash
percolator-cli withdraw \
  --slab <slab-pubkey> \
  --user-idx <your-index> \
  --amount <lamports>
```

**Constraints:**
- Cannot withdraw if you have open positions
- Can only withdraw capital (not unrealized profit)
- Must maintain margin requirements

### Close Account

Close your trading account and reclaim rent.

```bash
percolator-cli close-account \
  --slab <slab-pubkey> \
  --idx <your-index>
```

**Requirements:**
- No open positions
- Zero capital balance

## LP Operations

### Initialize LP Account

Create a new liquidity provider account.

```bash
percolator-cli init-lp --slab <slab-pubkey>
```

**Returns:** LP account index

**Note:** Use scripts for matcher-enabled LPs (see below)

### Add vAMM LP

Create a vAMM-configured LP with matcher context.

```bash
npx tsx scripts/add-vamm-lp.ts
```

**This script:**
1. Creates matcher context account
2. Initializes matcher with LP PDA
3. Initializes LP account
4. Deposits initial collateral

**Atomically** to prevent race conditions.

## Keeper Operations

### Keeper Crank

Update funding rates and process liquidations.

```bash
percolator-cli keeper-crank \
  --slab <slab-pubkey> \
  --oracle <oracle-pubkey>
```

**What it does:**
- Updates mark price from oracle
- Applies funding rate
- Processes liquidations (if any)
- Updates coverage ratio `h`
- Advances keeper state machine

**Required before trading:** Risk-increasing trades need a recent crank (within 200 slots / ~80s)

**Example:**
```bash
percolator-cli keeper-crank \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

### Keeper Bot

Run continuous keeper cranks (every 5 seconds).

```bash
npx tsx scripts/crank-bot.ts
```

**Use case:** Keep the market operational for testing

## Market Inspection

### View Slab State

```bash
# Full slab state
percolator-cli slab:get --slab <slab-pubkey>

# Just header
percolator-cli slab:header --slab <slab-pubkey>

# Just config
percolator-cli slab:config --slab <slab-pubkey>

# Just nonce
percolator-cli slab:nonce --slab <slab-pubkey>
```

### Dump Market State

Export full market state to JSON.

```bash
# Comprehensive state (positions, margins, parameters)
npx tsx scripts/dump-state.ts

# All on-chain fields
npx tsx scripts/dump-market.ts
```

**Output:** `state.json` or `market.json` with complete market snapshot

### Check Liquidation Risk

Identify accounts at risk of liquidation.

```bash
npx tsx scripts/check-liquidation.ts
```

**Output:**
- Accounts below maintenance margin
- Margin ratios
- Distance to liquidation

### Check Funding Rate

Display current funding rate and accumulation.

```bash
npx tsx scripts/check-funding.ts
```

**Output:**
- Current funding rate (bps per slot)
- Funding premium
- Open interest imbalance
- Accumulated funding since last update

### Check Risk Parameters

Display market risk configuration.

```bash
npx tsx scripts/check-params.ts
```

**Output:**
- Margin requirements
- Funding parameters
- Threshold configuration
- Fee structure

## Admin Operations

### Update Admin

Transfer admin authority to a new address.

```bash
percolator-cli update-admin \
  --slab <slab-pubkey> \
  --new-admin <new-admin-pubkey>
```

**Requires:** Current admin signature

### Set Risk Threshold

Update the liquidation threshold.

```bash
percolator-cli set-risk-threshold \
  --slab <slab-pubkey> \
  --threshold-bps <basis-points>
```

**Example:** Set 5% maintenance margin
```bash
percolator-cli set-risk-threshold \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --threshold-bps 500
```

### Top Up Insurance Fund

Add funds to the insurance fund.

```bash
percolator-cli topup-insurance \
  --slab <slab-pubkey> \
  --amount <lamports>
```

**Purpose:** Increase system resilience to liquidation losses

### Update Market Configuration

Update funding and threshold parameters.

```bash
percolator-cli update-config \
  --slab <slab-pubkey> \
  --funding-horizon-slots <n> \
  --funding-k-bps <n> \
  --funding-scale-notional-e6 <n> \
  --funding-max-premium-bps <n> \
  --funding-max-bps-per-slot <n> \
  --thresh-floor <n> \
  --thresh-risk-bps <n> \
  --thresh-update-interval-slots <n> \
  --thresh-step-bps <n> \
  --thresh-alpha-bps <n> \
  --thresh-min <n> \
  --thresh-max <n> \
  --thresh-min-step <n>
```

### Update Funding Configuration

Shortcut to update just funding parameters.

```bash
npx tsx scripts/update-funding-config.ts
```

**Edit the script** to set desired parameters.

## Oracle Authority (Testing Only)

### Set Oracle Authority

Enable admin-controlled price pushing.

```bash
percolator-cli set-oracle-authority \
  --slab <slab-pubkey> \
  --authority <authority-pubkey>
```

**Use case:** Testing flash crashes, ADL triggers, stress scenarios

**Disable:** Set authority to `11111111111111111111111111111111` (zero address)

### Push Oracle Price

Manually set the oracle price.

```bash
percolator-cli push-oracle-price \
  --slab <slab-pubkey> \
  --price <usd-price>
```

**Example:** Set SOL price to $143.50
```bash
percolator-cli push-oracle-price \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --price 143.50
```

**Security:**
- Only admin can set authority
- Only authority can push prices
- Zero price rejected (prevents division-by-zero)

## Testing & Simulation

### Random Traders Bot

Simulate 5 traders making random trades with momentum bias.

```bash
npx tsx scripts/random-traders.ts
```

**Features:**
- Routes to best LP by simulated price
- Momentum-based trading (trend following)
- Automatic position management
- Continuous operation

### Live Trading Test

Run a timed trading test with PnL validation.

```bash
# 3 minutes, normal market
npx tsx tests/t21-live-trading.ts 3

# 3 minutes, inverted market
npx tsx tests/t21-live-trading.ts 3 --inverted
```

**Validates:**
- Trade execution
- PnL calculation
- Funding application
- Margin requirements

### Stress Tests

#### Haircut System Stress Test
```bash
npx tsx scripts/stress-haircut-system.ts
```

Tests: Conservation, insurance, undercollateralization

#### Worst-Case Stress Test
```bash
npx tsx scripts/stress-worst-case.ts
```

Tests: Gap risk, insurance exhaustion, socialized losses

#### Oracle Authority Stress Test
```bash
# Run all scenarios
npx tsx scripts/oracle-authority-stress.ts

# Run specific scenario
npx tsx scripts/oracle-authority-stress.ts 0

# Disable oracle authority after tests
npx tsx scripts/oracle-authority-stress.ts --disable
```

Tests: Flash crash, price manipulation, funding attacks

#### Pen-Test Oracle
```bash
npx tsx scripts/pentest-oracle.ts
```

Comprehensive security testing: Flash crash, edge cases, timestamp attacks, funding manipulation

### Protocol Invariant Tests

```bash
# Price-profit relationship validation
npx tsx scripts/test-price-profit.ts

# Threshold auto-adjustment verification
npx tsx scripts/test-threshold-increase.ts

# LP profit realization and withdrawal
npx tsx scripts/test-lp-profit-realize.ts

# Profit withdrawal limit enforcement
npx tsx scripts/test-profit-withdrawal.ts
```

## User Tools

### Find User Account

Find user account index by owner pubkey.

```bash
# List all accounts
npx tsx scripts/find-user.ts <slab-pubkey>

# Find specific account
npx tsx scripts/find-user.ts <slab-pubkey> <owner-pubkey>
```

## Common Workflows

### First-Time Setup

```bash
# 1. Get devnet SOL
solana airdrop 2 --url devnet

# 2. Wrap SOL for collateral
spl-token wrap 1 --url devnet

# 3. Initialize user account
percolator-cli init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs

# 4. Deposit collateral
percolator-cli deposit \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx <your-idx> \
  --amount 50000000
```

### Execute a Trade

```bash
# 1. Check best prices
percolator-cli best-price \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# 2. Run keeper crank (required!)
percolator-cli keeper-crank \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# 3. Execute trade
percolator-cli trade-cpi \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx <your-idx> \
  --lp-idx 0 \
  --size 1000 \
  --matcher-program 4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy \
  --matcher-ctx 5n3jT6iy9TK3XNMQarC1sK26zS8ofjLG3dvE9iDEFYhK \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

### Monitor Market Health

```bash
# Check liquidation risk
npx tsx scripts/check-liquidation.ts

# Check funding rate
npx tsx scripts/check-funding.ts

# Dump full state
npx tsx scripts/dump-state.ts
```

### Setup New Market

```bash
# Setup devnet market with funded LP and insurance
npx tsx scripts/setup-devnet-market.ts
```

## Troubleshooting

### "Keeper crank too old"
Run `keeper-crank` within 200 slots (~80s) before trading.

### "Insufficient margin"
Deposit more collateral or reduce position size.

### "LP PDA signature missing"
Matcher security check failed. Ensure matcher is properly configured.

### "Oracle price stale"
Oracle hasn't updated recently. Wait for fresh price or check oracle status.

### "Simulation failed"
Use `--simulate` flag to see detailed error before sending transaction.
