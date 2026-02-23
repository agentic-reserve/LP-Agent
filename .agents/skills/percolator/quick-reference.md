# Percolator Quick Reference

## Core Formulas

### Coverage Ratio
```
Residual = max(0, V - C_tot - I)
h = min(Residual, PNL_pos_tot) / PNL_pos_tot

Where:
  V = vault balance
  C_tot = total capital
  I = insurance fund
  PNL_pos_tot = sum of positive PnL
```

### Effective PnL
```
effective_pnl = floor(max(PnL, 0) * h)
```

### Margin Requirements
```
maintenance_margin = abs(position) * mark_price * 0.05  (5%)
initial_margin = abs(position) * mark_price * 0.10  (10%)
```

### Funding Rate
```
net_oi = long_oi - short_oi
premium_bps = (net_oi * funding_k_bps) / funding_scale_notional
funding_per_slot = premium_bps / funding_horizon_slots
```

## CLI Commands Cheat Sheet

### Setup
```bash
# Get devnet SOL
solana airdrop 2 --url devnet

# Wrap SOL
spl-token wrap 1 --url devnet

# Init user
percolator-cli init-user --slab <slab>

# Deposit
percolator-cli deposit --slab <slab> --user-idx <n> --amount <lamports>
```

### Trading
```bash
# Check prices
percolator-cli best-price --slab <slab> --oracle <oracle>

# Keeper crank (required!)
percolator-cli keeper-crank --slab <slab> --oracle <oracle>

# Trade
percolator-cli trade-cpi \
  --slab <slab> --user-idx <n> --lp-idx <n> --size <i128> \
  --matcher-program <prog> --matcher-ctx <ctx> --oracle <oracle>
```

### Monitoring
```bash
# Market state
percolator-cli slab:get --slab <slab>

# Liquidation risk
npx tsx scripts/check-liquidation.ts

# Funding rate
npx tsx scripts/check-funding.ts

# Full state dump
npx tsx scripts/dump-state.ts
```

## Devnet Test Market

```
Slab:           A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
Program:        2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
Matcher:        4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
Oracle:         99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
Mint:           So11111111111111111111111111111111111111112 (Wrapped SOL)
Type:           INVERTED (price = 1/SOL)

LP 0:           Passive matcher (50bps spread)
LP 4:           vAMM matcher (5bps fee + dynamic spread)
```

## Account Structure

### Slab (Market)
- Magic: `0x5045_5243_534c_4142` ("PERCSLAB")
- Size: ~263 KB
- Max accounts: 1024
- Rent: ~2.5 SOL

### Account (User/LP)
- Size: 256 bytes
- Included in slab rent
- Fields: owner, capital, position, entry_price, warmup state

### LP PDA
```
seeds = [b"lp", slab.key(), lp_index.to_le_bytes()]
```

## Error Codes

```
0x1000  AccountNotFound
0x1001  AccountAlreadyExists
0x1002  AccountNotOwned
0x1003  AccountLiquidatable

0x2000  InsufficientMargin
0x2001  PositionTooLarge
0x2002  TradeTooSmall
0x2003  SlippageExceeded

0x3000  StaleOracle
0x3001  ZeroPrice
0x3002  PriceOutOfBounds
0x3003  LowOracleConfidence

0x4000  StaleKeeperCrank
0x4001  KeeperStepInvalid

0x5000  Unauthorized
0x5001  MissingRequiredSignature
0x5002  InvalidLpPda

0x6000  InsufficientBalance
0x6001  InsufficientInsurance
0x6002  InvalidState
```

## Keeper State Machine

```
Step 0:   Start sweep, update mark price
Steps 1-14: Process liquidations (64 accounts each)
Step 15:  Update funding, update threshold
```

Cycle duration: ~80 seconds (16 steps × 5s)

## Risk Parameters

```
Maintenance Margin:     5% (500 bps)
Initial Margin:         10% (1000 bps)
Trading Fee:            0.1% (10 bps)

Funding Horizon:        7200 slots (~1 hour)
Funding K:              100 bps
Max Funding Premium:    500 bps (5%)
Max Funding Per Slot:   1 bps

Threshold Floor:        500 bps (5%)
Threshold Risk:         1000 bps (10%)
Threshold Min:          300 bps (3%)
Threshold Max:          2000 bps (20%)
```

## Matcher Context Layout

```
Offset  Size  Field
0       8     magic (0x5045_5243_4d41_5443)
8       4     version (3)
12      1     kind (0=Passive, 1=vAMM)
16      32    lp_pda
48      4     trading_fee_bps
52      4     base_spread_bps
56      4     max_total_bps
60      4     impact_k_bps
64      16    liquidity_notional_e6
80      16    max_fill_abs
96      16    inventory_base
112     8     last_oracle_price_e6
120     8     last_exec_price_e6
128     16    max_inventory_abs
```

## Common Patterns

### Initialize and Fund User
```typescript
const userIdx = await initUser(slab);
await deposit(slab, userIdx, 100_000_000); // 0.1 SOL
```

### Execute Trade
```typescript
await keeperCrank(slab, oracle);
await tradeCpi(slab, userIdx, lpIdx, 1000, matcherProgram, matcherCtx, oracle);
```

### Check Account Status
```typescript
const account = await getAccount(slab, userIdx);
console.log('Capital:', account.capital);
console.log('Position:', account.position);
console.log('PnL:', calculatePnl(account, markPrice));
```

### Monitor Coverage Ratio
```typescript
const slab = await getSlab(slabPubkey);
const h = slab.coverageRatioNum / slab.coverageRatioDen;
if (h < 0.8) {
  console.warn('Coverage ratio low:', h);
}
```

## Testing Commands

```bash
# Unit tests
cd percolator && cargo test

# Formal verification
cd percolator && cargo kani

# Integration tests
cd percolator-cli && pnpm test

# Live trading test
npx tsx tests/t21-live-trading.ts 3

# Stress tests
npx tsx scripts/stress-haircut-system.ts
npx tsx scripts/stress-worst-case.ts
npx tsx scripts/oracle-authority-stress.ts

# Security tests
npx tsx scripts/pentest-oracle.ts
```

## Useful Scripts

```bash
# Setup devnet market
npx tsx scripts/setup-devnet-market.ts

# Add vAMM LP
npx tsx scripts/add-vamm-lp.ts

# Run keeper bot
npx tsx scripts/crank-bot.ts

# Run random traders
npx tsx scripts/random-traders.ts

# Find user account
npx tsx scripts/find-user.ts <slab> <owner>

# Update funding config
npx tsx scripts/update-funding-config.ts
```

## Oracle Feeds

### Pyth (Mainnet)
```
SOL/USD: 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
BTC/USD: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
ETH/USD: 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
```

### Chainlink (Devnet)
```
SOL/USD: 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
BTC/USD: CzZQBrJCLqjXRfMjRN3fhbxur2QYHUzkpaRwkWsiPqbz
ETH/USD: 2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b7Go
```

## Compute Units

```
InitUser:       ~5,000 CU
Deposit:        ~10,000 CU
Withdraw:       ~10,000 CU
TradeNoCpi:     ~30,000 CU
TradeCpi:       ~50,000 CU
KeeperCrank:    ~100,000 CU
```

## Important Constraints

- Max accounts: 1024
- Max position size: Limited by margin requirements
- Min trade size: Configurable (prevent dust)
- Keeper crank freshness: 200 slots (~80s)
- Oracle staleness: 60s (mainnet), 300s (devnet)
- Max funding rate change: 1 bps per slot

## Security Checklist

Matcher development:
- [ ] LP PDA signature verification
- [ ] LP PDA stored in context
- [ ] Atomic creation (context + LP)
- [ ] Return data format correct
- [ ] Integer overflow protection
- [ ] Price bounds validation

General:
- [ ] All arithmetic checked
- [ ] Oracle validation implemented
- [ ] Access control verified
- [ ] Reentrancy guards added
- [ ] State updates atomic
- [ ] Tests passing

## Resources

- Core library: `percolator/`
- Solana program: `percolator-prog/`
- CLI tool: `percolator-cli/`
- Matcher: `percolator-match/`

- Paper: https://arxiv.org/abs/2512.01112
- GitHub: https://github.com/aeyakovenko/percolator
- License: Apache 2.0

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**
- NOT audited
- NOT production ready
- Do NOT use with real funds
- For learning and testing only
