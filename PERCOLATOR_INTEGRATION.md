# Percolator + HawkFi Integration Guide

## Overview

Percolator is a perpetual futures protocol with unique risk management that complements HawkFi's LP management. This guide shows how to integrate both systems.

## Why Integrate?

### HawkFi Strengths
- Precision LP management (69-bin curve)
- ML-powered rebalancing
- Auto-compound and risk management
- Optimized for liquidity provision

### Percolator Strengths
- Perpetual futures trading
- Self-healing risk model (no forced ADL)
- Global coverage ratio `h`
- Predictable profit withdrawal

### Combined Benefits
1. **Hedge LP Impermanent Loss** with perp positions
2. **ML Signals for Perp Trading** using your OpenRouter ensemble
3. **Unified Risk Dashboard** showing LP + perp exposure
4. **Capital Efficiency** through coordinated strategies

## Integration Scenarios

### 1. LP Position Hedging

**Problem**: LP positions suffer impermanent loss when prices move
**Solution**: Open offsetting perp position on Percolator

```typescript
// Example: Hedge SOL/USDC LP position
const lpPosition = {
  pool: 'SOL/USDC',
  liquidity: 1000,
  lowerPrice: 90,
  upperPrice: 110,
  currentPrice: 100,
};

// Calculate hedge
const lpValue = lpPosition.liquidity * lpPosition.currentPrice;
const hedgeSize = -lpValue; // Short to offset long LP exposure

// Execute on Percolator
await percolatorTrade({
  slab: PERCOLATOR_SLAB,
  size: hedgeSize,
  matcher: 'vAMM',
});
```

### 2. ML-Driven Perp Trading

**Use Case**: Apply HawkFi ML signals to perp trading

```typescript
// Generate ML signal
const signal = await mlEnsemble.generateSignal({
  poolId: 'SOL/USDC',
  currentPrice: 100,
  volume24h: 1000000,
  liquidity: 5000000,
  priceHistory: [...],
});

// If high confidence, trade perp
if (signal.confidence >= 90) {
  const perpSize = calculatePositionSize(signal);
  
  if (signal.action === 'buy') {
    await percolatorTrade({ size: perpSize }); // Long
  } else if (signal.action === 'sell') {
    await percolatorTrade({ size: -perpSize }); // Short
  }
}
```

### 3. Unified Dashboard

Add Percolator positions to your HawkFi UI:

```typescript
// Fetch both LP and perp positions
const lpPositions = await fetchLPPositions(walletAddress);
const perpPositions = await fetchPerpPositions(walletAddress);

// Calculate combined metrics
const totalExposure = calculateTotalExposure(lpPositions, perpPositions);
const netPnL = calculateNetPnL(lpPositions, perpPositions);
const hedgeRatio = calculateHedgeRatio(lpPositions, perpPositions);
```

## Technical Integration

### Prerequisites

```bash
# Install Percolator CLI
cd percolator-cli
pnpm install

# Get devnet SOL
solana airdrop 2 --url devnet

# Wrap SOL for trading
spl-token wrap 1 --url devnet
```

### Devnet Test Market

```
Slab:    A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
Program: 2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
Oracle:  99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR (Chainlink SOL/USD)
Type:    INVERTED (long = long USD, profit if SOL drops)
```

### Basic Integration Steps

#### 1. Initialize Percolator User

```bash
# Create user account
percolator-cli init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs

# Deposit collateral
percolator-cli deposit \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx 0 \
  --amount 100000000  # 0.1 SOL
```

#### 2. Execute Trades

```bash
# Run keeper crank (required before trading)
percolator-cli keeper-crank \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# Execute trade
percolator-cli trade-cpi \
  --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs \
  --user-idx 0 \
  --lp-idx 0 \
  --size 1000 \
  --matcher-program 4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy \
  --matcher-ctx <context> \
  --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

#### 3. Monitor Positions

```bash
# Check position
percolator-cli slab:get --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs

# Check coverage ratio
npx tsx scripts/dump-state.ts
```

### Add to HawkFi Backend

Update your `.env`:

```bash
# Percolator Configuration
PERCOLATOR_SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
PERCOLATOR_PROGRAM=2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
PERCOLATOR_MATCHER=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
PERCOLATOR_ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

### Database Schema Extension

Add perp positions table:

```sql
-- Percolator perpetual positions
CREATE TABLE perp_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  percolator_user_idx INTEGER NOT NULL,
  slab_address TEXT NOT NULL,
  capital NUMERIC(30, 10) NOT NULL,
  position_size NUMERIC(30, 10) NOT NULL, -- i128
  entry_price NUMERIC(20, 10) NOT NULL,
  unrealized_pnl NUMERIC(30, 10) DEFAULT 0,
  coverage_ratio NUMERIC(5, 4) DEFAULT 1.0, -- h value
  lp_position_id UUID REFERENCES positions(id), -- If hedging LP
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perp_positions_user ON perp_positions(user_id);
CREATE INDEX idx_perp_positions_lp ON perp_positions(lp_position_id);
```

## Use Cases

### 1. Delta-Neutral LP Strategy

Maintain LP position while hedging price risk:

```
LP Position:  Long SOL/USDC (exposed to SOL price)
Perp Hedge:   Short SOL perp (offset price exposure)
Net Result:   Earn LP fees with minimal IL
```

### 2. Directional LP + Perp

Amplify directional bets:

```
Bullish on SOL:
- LP Position: SOL/USDC (earn fees + price appreciation)
- Perp Position: Long SOL (amplify upside)
- Combined: 2x exposure with fee income
```

### 3. ML-Driven Rotation

Use ML signals to rotate between LP and perp:

```
High Volatility Signal:
- Close LP positions (avoid IL)
- Open perp positions (capture moves)

Low Volatility Signal:
- Close perp positions
- Open LP positions (earn fees)
```

## Risk Considerations

### Percolator-Specific Risks

1. **Coverage Ratio `h`**
   - When `h < 1.0`, profits are haircut on withdrawal
   - Monitor `h` before withdrawing profits
   - System self-heals as conditions improve

2. **Inverted Markets**
   - Long position = long USD (profit if SOL drops)
   - Short position = short USD (profit if SOL rises)
   - Understand direction before trading

3. **Keeper Crank Requirement**
   - Must run keeper within 200 slots (~80s) before trading
   - Use keeper bot or manual crank

4. **Educational Project**
   - NOT audited
   - NOT production ready
   - Use devnet only

### Combined LP + Perp Risks

1. **Correlation Risk**: LP and perp may not move perfectly together
2. **Funding Costs**: Perp positions pay/receive funding
3. **Liquidation Risk**: Perp positions can be liquidated
4. **Complexity**: Managing both systems requires expertise

## Monitoring Dashboard

Add these metrics to your HawkFi UI:

```typescript
interface CombinedMetrics {
  // LP Metrics
  lpPositions: number;
  lpTVL: number;
  lpPnL: number;
  
  // Perp Metrics
  perpPositions: number;
  perpNotional: number;
  perpPnL: number;
  coverageRatio: number; // h
  
  // Combined
  totalExposure: number;
  netPnL: number;
  hedgeRatio: number;
  effectiveRisk: number;
}
```

## Next Steps

1. **Test on Devnet**
   - Create Percolator user
   - Execute test trades
   - Monitor coverage ratio

2. **Integrate Backend**
   - Add perp_positions table
   - Create API endpoints
   - Implement hedge calculations

3. **Update Frontend**
   - Add perp positions tab
   - Show combined metrics
   - Display coverage ratio

4. **Keeper Integration**
   - Add Percolator crank to keeper
   - Monitor perp positions
   - Auto-hedge LP positions

## Resources

- **Percolator Docs**: `.agents/skills/percolator/`
- **Paper**: https://arxiv.org/abs/2512.01112
- **Devnet Market**: A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
- **HawkFi Docs**: `README.md`, `ARCHITECTURE.md`

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**
- Percolator is NOT audited
- NOT production ready
- Do NOT use with real funds
- For learning and testing only

---

**Combining HawkFi LP Management with Percolator Perpetuals**

*Precision Curve • ML Ensemble • Delta-Neutral Hedging • Self-Healing Risk*
