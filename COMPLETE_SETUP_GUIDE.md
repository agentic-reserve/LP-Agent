# 🎯 Complete HawkFi + Percolator Setup Guide

## Overview

This guide walks you through deploying HawkFi, testing Percolator, integrating perp positions, and experimenting with delta-neutral strategies.

## 📋 Prerequisites

- [ ] Node.js 18+
- [ ] Git
- [ ] Railway account
- [ ] Supabase account
- [ ] Helius API key
- [ ] OpenRouter API key
- [ ] Solana CLI (for Percolator)
- [ ] Phantom/Solflare wallet

## Part 1: Deploy HawkFi to Railway (30 minutes)

### Step 1: Prepare Environment

```bash
# Clone your repository
cd hawkfi-hfl-platform

# Install dependencies
npm install

# Test build locally
npm run build
```

### Step 2: Setup Supabase

1. Create project at https://supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Get API keys from Settings → API

### Step 3: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set HELIUS_API_KEY=your_key
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_key
railway variables set SUPABASE_ANON_KEY=your_key
railway variables set OPENROUTER_API_KEY=sk-or-v1-xxx
railway variables set NODE_ENV=production

# Deploy
railway up

# Get URL
railway domain
```

### Step 4: Verify Deployment

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Test API
curl https://your-app.railway.app/api/pools

# Open frontend
open https://your-app.railway.app
```

✅ **Checkpoint**: HawkFi is deployed and accessible

## Part 2: Test Percolator on Devnet (20 minutes)

### Step 1: Setup Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure for devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2
```

### Step 2: Install Percolator CLI

```bash
# Clone Percolator (if needed)
git clone https://github.com/aeyakovenko/percolator.git
cd percolator/percolator-cli

# Install dependencies
pnpm install
```

### Step 3: Wrap SOL

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Wrap 1 SOL
spl-token wrap 1 --url devnet
```

### Step 4: Initialize User

```bash
# Set environment variables
export SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
export ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# Initialize user
npx percolator-cli init-user --slab $SLAB

# Save your user index (e.g., 42)
export USER_IDX=42

# Deposit collateral
npx percolator-cli deposit \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --amount 100000000
```

### Step 5: Execute Test Trade

```bash
# Run keeper crank
npx percolator-cli keeper-crank --slab $SLAB --oracle $ORACLE

# Get matcher context
export LP_IDX=0
export MATCHER_PROG=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
export MATCHER_CTX=$(npx tsx scripts/get-matcher-ctx.ts $SLAB $LP_IDX)

# Execute trade
npx percolator-cli trade-cpi \
  --slab $SLAB \
  --user-idx $USER_IDX \
  --lp-idx $LP_IDX \
  --size 1000 \
  --matcher-program $MATCHER_PROG \
  --matcher-ctx $MATCHER_CTX \
  --oracle $ORACLE

# Verify position
npx percolator-cli slab:get --slab $SLAB | grep -A 10 "Account $USER_IDX"
```

✅ **Checkpoint**: Percolator position opened successfully

## Part 3: Integrate Perp Positions (15 minutes)

### Step 1: Update Database Schema

Run this SQL in Supabase:

```sql
-- Percolator perpetual positions
CREATE TABLE perp_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  percolator_user_idx INTEGER NOT NULL,
  slab_address TEXT NOT NULL,
  capital NUMERIC(30, 10) NOT NULL,
  position_size NUMERIC(30, 10) NOT NULL,
  entry_price NUMERIC(20, 10) NOT NULL,
  unrealized_pnl NUMERIC(30, 10) DEFAULT 0,
  coverage_ratio NUMERIC(5, 4) DEFAULT 1.0,
  lp_position_id UUID REFERENCES positions(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perp_positions_user ON perp_positions(user_id);
CREATE INDEX idx_perp_positions_lp ON perp_positions(lp_position_id);
```

### Step 2: Add Percolator Config

Update your `.env` and Railway variables:

```bash
# Local .env
PERCOLATOR_SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
PERCOLATOR_PROGRAM=2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
PERCOLATOR_MATCHER=4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy
PERCOLATOR_ORACLE=99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

# Railway
railway variables set PERCOLATOR_SLAB=A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs
railway variables set PERCOLATOR_PROGRAM=2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp
```

### Step 3: Redeploy

```bash
# Redeploy with new changes
railway up

# Or push to GitHub
git add .
git commit -m "Add Percolator integration"
git push origin main
```

### Step 4: Test Integration

```bash
# Test perp positions endpoint
curl https://your-app.railway.app/api/percolator/positions/YOUR_WALLET

# Test coverage ratio
curl https://your-app.railway.app/api/percolator/coverage-ratio

# Open dashboard and check "Perp Positions" tab
open https://your-app.railway.app
```

✅ **Checkpoint**: Perp positions visible in dashboard

## Part 4: Delta-Neutral Strategies (Ongoing)

### Strategy 1: Hedge LP Position

**Goal**: Earn LP fees while minimizing impermanent loss

```typescript
// 1. Open LP position
const lpPosition = await createLPPosition({
  pool: 'SOL/USDC',
  lowerPrice: 90,
  upperPrice: 110,
  liquidity: 1000,
});

// 2. Calculate hedge
const hedgeSize = -lpPosition.liquidity * 100; // Negative = short

// 3. Open perp hedge
await openPerpPosition({
  size: hedgeSize,
  matcher: 'vAMM',
});

// Result: Earn LP fees with minimal IL
```

### Strategy 2: Amplified Directional

**Goal**: Amplify bullish/bearish bets with LP + perp

```typescript
// Bullish on SOL:
// 1. LP position (earn fees + price appreciation)
const lpPosition = await createLPPosition({
  pool: 'SOL/USDC',
  liquidity: 1000,
});

// 2. Long perp (amplify upside)
await openPerpPosition({
  size: 2000, // 2x exposure
  matcher: 'vAMM',
});

// Result: 3x SOL exposure (1x LP + 2x perp) + fee income
```

### Strategy 3: ML-Driven Rotation

**Goal**: Rotate between LP and perp based on ML signals

```typescript
// High volatility signal:
if (mlSignal.predictedVolatility > 0.5) {
  // Close LP (avoid IL)
  await closeLPPosition(lpPositionId);
  
  // Open perp (capture moves)
  await openPerpPosition({
    size: mlSignal.action === 'buy' ? 1000 : -1000,
  });
}

// Low volatility signal:
if (mlSignal.predictedVolatility < 0.2) {
  // Close perp
  await closePerpPosition(perpPositionId);
  
  // Open LP (earn fees)
  await createLPPosition({
    pool: 'SOL/USDC',
    liquidity: 1000,
  });
}
```

### Strategy 4: Coverage Ratio Arbitrage

**Goal**: Exploit low coverage ratio for discounted profit withdrawal

```typescript
// Monitor coverage ratio
const h = await getCoverageRatio();

if (h < 0.7) {
  // System stressed - profits discounted
  // Accumulate positions at discount
  await openPerpPosition({ size: 1000 });
}

if (h > 0.95) {
  // System healthy - withdraw profits
  await closePerpPosition(perpPositionId);
  await withdrawProfits();
}
```

## Monitoring Dashboard

### Key Metrics to Track

1. **LP Metrics**
   - Total liquidity provided
   - Unclaimed fees
   - Impermanent loss
   - Active bins

2. **Perp Metrics**
   - Total notional exposure
   - Unrealized PnL
   - Coverage ratio (h)
   - Effective PnL (after haircut)

3. **Combined Metrics**
   - Net exposure
   - Hedge ratio
   - Total PnL (LP + perp)
   - Risk-adjusted returns

### Example Dashboard View

```
┌─────────────────────────────────────────────┐
│ HawkFi + Percolator Dashboard               │
├─────────────────────────────────────────────┤
│ LP Positions:        3                      │
│ LP TVL:              $10,000                │
│ LP Fees (24h):       $25                    │
│ LP IL:               -2.5%                  │
├─────────────────────────────────────────────┤
│ Perp Positions:      2                      │
│ Perp Notional:       $8,000                 │
│ Perp PnL:            +$150                  │
│ Coverage Ratio:      95%                    │
├─────────────────────────────────────────────┤
│ Combined:                                   │
│ Net Exposure:        $12,000                │
│ Hedge Ratio:         80%                    │
│ Total PnL:           +$175                  │
│ Risk Score:          Medium                 │
└─────────────────────────────────────────────┘
```

## Best Practices

### Risk Management

1. **Start Small**: Test with small positions first
2. **Monitor Coverage Ratio**: Watch `h` before withdrawing profits
3. **Set Stop Losses**: Use HawkFi's SL automation
4. **Diversify**: Don't put all capital in one strategy
5. **Understand Inverted Markets**: Long = profit if SOL drops

### Performance Optimization

1. **Run Keeper Regularly**: Ensure keeper crank runs every 5 minutes
2. **Use vAMM for Large Trades**: Better pricing for size
3. **Monitor Funding Rates**: Avoid paying excessive funding
4. **Rebalance Strategically**: Use ML signals for timing

### Security

1. **Use Devnet First**: Test thoroughly before mainnet
2. **Verify Transactions**: Always check tx details
3. **Secure Keys**: Never share private keys
4. **Monitor Positions**: Set up alerts for liquidations

## Troubleshooting

### Issue: Perp position not showing in dashboard

```bash
# Check database
SELECT * FROM perp_positions WHERE user_id = 'YOUR_USER_ID';

# Check API
curl https://your-app.railway.app/api/percolator/positions/YOUR_WALLET

# Verify Percolator user index matches
```

### Issue: Coverage ratio always 1.0

```bash
# This is normal if system is healthy
# Coverage ratio drops only during market stress

# To test, check actual slab data:
npx tsx scripts/dump-state.ts | grep Coverage
```

### Issue: Can't execute perp trade

```bash
# Common causes:
# 1. Keeper crank not run (must be within 200 slots)
npx percolator-cli keeper-crank --slab $SLAB --oracle $ORACLE

# 2. Insufficient margin
npx percolator-cli deposit --slab $SLAB --user-idx $USER_IDX --amount 50000000

# 3. Stale oracle
# Wait for oracle update or use different oracle
```

## Next Steps

1. ✅ HawkFi deployed to Railway
2. ✅ Percolator tested on devnet
3. ✅ Perp positions integrated
4. ✅ Delta-neutral strategies documented
5. → Monitor and optimize strategies
6. → Scale to mainnet (when ready)
7. → Add more advanced features

## Resources

- **HawkFi Docs**: README.md, ARCHITECTURE.md
- **Percolator Docs**: PERCOLATOR_INTEGRATION.md
- **Deployment**: DEPLOY_NOW.md
- **Testing**: PERCOLATOR_TEST.md
- **Railway**: https://railway.app/dashboard
- **Supabase**: https://supabase.com/dashboard

## Support

- GitHub Issues: [Your Repo]
- Discord: [Your Server]
- Telegram: @daemonprotocol888

## Disclaimer

⚠️ **EDUCATIONAL PROJECT**
- HawkFi: Production-ready but use at your own risk
- Percolator: NOT audited, devnet only
- Do NOT use with funds you can't afford to lose
- Always test thoroughly before scaling

---

**Complete HawkFi + Percolator Platform Ready! 🦅**

*Precision LP Management • Perpetual Futures • Delta-Neutral Strategies • ML-Powered*
