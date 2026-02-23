# Percolator: A New Approach to Perpetual Futures Risk Management

## The Problem with Traditional ADL

Traditional perpetual futures exchanges use Auto-Deleveraging (ADL):
1. User gets liquidated
2. Insurance fund absorbs the loss
3. If insurance is depleted → forcibly close profitable positions (ADL)

**Problems:**
- Profitable traders lose positions without consent
- Unpredictable forced exits
- Manual re-entry required

## Percolator's Solution: Profit as Junior Claims

Instead of forcibly closing positions, Percolator treats profits differently:

### Two Types of Claims

1. **Capital (Senior)**: Your deposits - always withdrawable
2. **Profit (Junior)**: Your gains - must mature before withdrawal

### The Global Coverage Ratio `h`

```
h = min(Residual, Total_Positive_PnL) / Total_Positive_PnL

Where:
  Residual = Vault - Total_Capital - Insurance
```

**Examples:**
- Fully backed: `h = 1.0` (100% of profits backed)
- Stressed: `h = 0.25` (only 25% of profits backed)

### How It Works

1. **Trading**: Normal - open/close positions as usual
2. **Profit Realization**: Profits must "warm up" before withdrawal
3. **Withdrawal**: Only capital + matured profits can be withdrawn
4. **Haircut**: Amount withdrawn = `warmable_amount × h`

### Self-Healing

As the market recovers:
- Losses are realized → `h` increases
- Insurance grows → `h` increases  
- New deposits → `h` increases
- Automatic, no manual intervention

## Key Advantages

| Feature | ADL | Percolator |
|---------|-----|------------|
| Position closure | Forced | Voluntary |
| Profit access | Immediate | Time-gated |
| Recovery | Manual | Automatic |
| Predictability | Low | High |
| Solvency | Guaranteed | Guaranteed |

## Architecture

### Components

1. **percolator** (Rust): Core risk engine with formal verification
   - 145 Kani proofs
   - Conservation laws
   - Principal protection
   - No-teleport properties

2. **percolator-prog**: Solana smart contract
   - Market initialization
   - User accounts
   - LP accounts
   - Keeper operations

3. **percolator-match**: Matcher programs
   - Passive: Fixed spread
   - vAMM: Dynamic pricing with impact

4. **percolator-cli**: Command-line interface
   - User operations
   - LP management
   - Keeper bots
   - Testing tools

### Oracle Support

- **Pyth Network**: Real-time price feeds
- **Chainlink**: OCR2 aggregators
- **Oracle Authority**: Admin-controlled (testing only)

### Inverted Markets

Markets can be inverted (e.g., SOL/USD with SOL collateral):
- Long position = long USD (profit if SOL drops)
- Short position = short USD (profit if SOL rises)
- Useful for native token collateral

## Risk Parameters

```
Maintenance Margin: 5%
Initial Margin: 10%
Trading Fee: 10 bps (0.1%)
```

### Funding Rate

Dynamic funding based on:
- Open interest imbalance
- Configurable horizon and scale
- Capped premium and rate per slot

### Threshold System

Auto-adjusting liquidation threshold:
- Increases when system is stressed
- Decreases when system is healthy
- Prevents cascade liquidations

## Testing & Verification

### Formal Verification (Kani)
```bash
cd percolator
cargo kani
```

### Unit Tests
```bash
cd percolator-cli
pnpm test
```

### Integration Tests
```bash
cd percolator-cli
./test-vectors.sh
```

### Stress Tests
```bash
# Haircut system stress test
npx tsx scripts/stress-haircut-system.ts

# Worst-case scenarios
npx tsx scripts/stress-worst-case.ts

# Oracle manipulation
npx tsx scripts/oracle-authority-stress.ts

# Security pen-testing
npx tsx scripts/pentest-oracle.ts
```

### Live Trading Test
```bash
# 3 minutes of random trading with PnL validation
npx tsx tests/t21-live-trading.ts 3
```

## Development Workflow

### 1. Setup Market
```bash
npx tsx scripts/setup-devnet-market.ts
```

### 2. Run Keeper Bot
```bash
npx tsx scripts/crank-bot.ts
```

### 3. Simulate Trading
```bash
npx tsx scripts/random-traders.ts
```

### 4. Monitor State
```bash
# Full market state
npx tsx scripts/dump-state.ts

# Check liquidation risk
npx tsx scripts/check-liquidation.ts

# Check funding rate
npx tsx scripts/check-funding.ts
```

## Creating Custom Matchers

Matchers determine trade pricing. You can create custom pricing logic:

### Security Requirements

⚠️ **CRITICAL**: Matcher must verify LP PDA signature
```rust
if !lp_pda.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}
```

### Matcher Interface

1. **Init** (tag `0x02`): Store LP PDA for verification
2. **Match** (tag `0x00`): Price the trade

### Atomic Creation

Must create matcher context AND initialize LP in ONE transaction to prevent race conditions.

## Resources

- **Paper**: [Autodeleveraging: Impossibilities and Optimization](https://arxiv.org/abs/2512.01112)
- **Devnet Market**: A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
- **License**: Apache 2.0

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**
- NOT audited
- NOT production ready
- Do NOT use with real funds
- For learning and testing only
