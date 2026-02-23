# HawkFi HFL Platform - Testing Guide

## Testing Strategy

### 1. Local Development Testing

#### Frontend Testing
```bash
# Start dev server
npm run dev:frontend

# Test wallet connection
1. Open http://localhost:5173
2. Click "Connect Wallet"
3. Select Phantom/Solflare
4. Approve connection
5. Verify wallet address displayed
```

#### Backend API Testing
```bash
# Start backend
npm run dev:backend

# Health check
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-...",
  "services": {
    "helius": true,
    "supabase": true,
    "magicblock": true
  }
}
```

#### Database Testing
```bash
# Test Supabase connection
# In Supabase SQL Editor, run:
SELECT * FROM users LIMIT 1;
SELECT * FROM pools WHERE active = true;
SELECT * FROM ml_signals WHERE confidence >= 90;
```

### 2. API Endpoint Testing

#### Create Strategy
```bash
curl -X POST http://localhost:3001/api/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "name": "Test HFL Strategy",
    "strategyType": "hfl",
    "precisionBins": 69,
    "mcuEnabled": true,
    "autoRebalance": true,
    "mlEnabled": true,
    "currentPrice": 1.0
  }'
```

#### Get User Strategies
```bash
curl http://localhost:3001/api/strategies/user/YOUR_WALLET_ADDRESS
```

#### Generate ML Signal
```bash
curl -X POST http://localhost:3001/api/ml/signal/POOL_ID \
  -H "Content-Type: application/json"
```

#### Get ML Metrics
```bash
curl http://localhost:3001/api/ml/metrics
```

### 3. Keeper Testing

#### Manual Keeper Run
```bash
npm run keeper

# Expected output:
🦅 HawkFi Keeper starting... 2024-...
📊 Position abc123 needs rebalance
🤖 ML signal generated for pool xyz789: rebalance (92%)
⚙️  Executing job 1: rebalance
✅ Job 1 completed
✅ Keeper cycle completed
```

#### Test Keeper Jobs
```sql
-- Insert test keeper job
INSERT INTO keeper_jobs (job_type, status, priority)
VALUES ('monitor', 'pending', 5);

-- Run keeper
-- Check job status
SELECT * FROM keeper_jobs ORDER BY created_at DESC LIMIT 5;
```

### 4. Precision Curve Testing

#### Test Bin Generation
```typescript
// In backend/services/precision-curve.ts
import { precisionCurve } from './precision-curve';

// Generate bins
const bins = precisionCurve.generateBins(1.0);
console.log('Total bins:', bins.length); // Should be 69
console.log('Total allocation:', 
  bins.reduce((sum, b) => sum + b.liquidityAllocation, 0)
); // Should be ~100

// Test MCU bias
const mcuBins = precisionCurve.applyMCUBias(bins, 1.3);
const upperAllocation = mcuBins
  .slice(35)
  .reduce((sum, b) => sum + b.liquidityAllocation, 0);
console.log('Upper bins allocation:', upperAllocation); // Should be >50%
```

#### Test Rebalance Logic
```typescript
const needsRebalance = precisionCurve.shouldRebalance(
  1.5, // current price
  bins, // active bins
  5.0  // threshold
);
console.log('Needs rebalance:', needsRebalance);
```

### 5. ML Ensemble Testing

#### Test OpenRouter Connection
```typescript
// In backend/services/ml-ensemble.ts
import { mlEnsemble } from './ml-ensemble';

const prediction = await mlEnsemble.generateSignal({
  poolId: 'test-pool',
  currentPrice: 1.0,
  volume24h: 1000000,
  liquidity: 5000000,
  priceHistory: [
    { price: 0.95, timestamp: '2024-01-01T00:00:00Z' },
    { price: 0.98, timestamp: '2024-01-01T01:00:00Z' },
    { price: 1.00, timestamp: '2024-01-01T02:00:00Z' },
    // ... more data points
  ],
});

console.log('Prediction:', prediction);
// Expected: { confidence: 90-100, action: 'buy'|'sell'|'hold'|'rebalance', ... }
```

#### Test Model Fallback
```bash
# Temporarily set invalid primary model
export OPENROUTER_API_KEY=invalid_key

# Run ML signal generation
npm run keeper

# Should see fallback message:
⚠️  Minimax failed, falling back to DeepSeek: ...
```

### 6. Integration Testing

#### End-to-End Strategy Creation
```bash
# 1. Create user (via wallet connection)
# 2. Create strategy
curl -X POST http://localhost:3001/api/strategies \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# 3. Verify strategy in database
SELECT * FROM strategies WHERE name = 'Test HFL Strategy';

# 4. Verify precision bins created
SELECT COUNT(*) FROM precision_bins WHERE strategy_id = 'STRATEGY_ID';
# Should return 69

# 5. Create position
curl -X POST http://localhost:3001/api/positions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET",
    "poolId": "POOL_ID",
    "positionAddress": "POSITION_ADDRESS",
    "lowerPrice": 0.9,
    "upperPrice": 1.1,
    "liquidity": 1000,
    "strategyId": "STRATEGY_ID"
  }'

# 6. Check rebalance status
curl http://localhost:3001/api/positions/POSITION_ID/check-rebalance
```

### 7. Performance Testing

#### Load Testing (Artillery)
```bash
# Install artillery
npm install -g artillery

# Create test config
cat > artillery-test.yml << EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/health"
      - get:
          url: "/api/pools"
EOF

# Run test
artillery run artillery-test.yml
```

#### Database Performance
```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM positions
WHERE user_id = 'USER_ID'
AND status = 'active';

-- Should use index idx_positions_user
```

### 8. Security Testing

#### Test RLS Policies
```sql
-- Set user context
SET request.jwt.claim.sub = 'USER_ID';

-- Try to access another user's data
SELECT * FROM positions WHERE user_id != 'USER_ID';
-- Should return 0 rows

-- Reset
RESET request.jwt.claim.sub;
```

#### Test API Authentication
```bash
# Try to access protected endpoint without auth
curl http://localhost:3001/api/strategies/user/WALLET
# Should work (read-only)

# Try to create without proper wallet
curl -X POST http://localhost:3001/api/strategies \
  -H "Content-Type: application/json" \
  -d '{ "walletAddress": "invalid" }'
# Should fail validation
```

### 9. Error Handling Testing

#### Test ML Confidence Threshold
```typescript
// Modify ml-ensemble.ts temporarily to return low confidence
// Expected: Error thrown, signal not saved

// Verify in logs:
⚠️  ML signal failed for pool xyz: Confidence 85% below threshold (90%)
```

#### Test Database Connection Failure
```bash
# Stop Supabase or use invalid credentials
export SUPABASE_URL=invalid

# Start backend
npm run dev:backend

# Should see error and exit
```

#### Test Keeper Job Retry
```sql
-- Create failing job
INSERT INTO keeper_jobs (job_type, status, max_retries)
VALUES ('test_fail', 'pending', 3);

-- Run keeper multiple times
-- Verify retry_count increments
SELECT retry_count FROM keeper_jobs WHERE job_type = 'test_fail';
```

### 10. Deployment Testing

#### Railway Staging
```bash
# Deploy to staging
railway up --environment staging

# Test health
curl https://your-app-staging.railway.app/health

# Test API
curl https://your-app-staging.railway.app/api/pools

# Check logs
railway logs --environment staging
```

#### Production Smoke Tests
```bash
# After production deploy
curl https://your-app.railway.app/health
curl https://your-app.railway.app/api/pools

# Test frontend
open https://your-app.railway.app
# Connect wallet
# Create strategy
# Verify in Supabase dashboard
```

## Test Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] Database schema applied
- [ ] Health endpoint returns 200
- [ ] Wallet connection works
- [ ] Strategy creation works
- [ ] ML signals generate (confidence ≥90%)
- [ ] Keeper runs without errors
- [ ] Precision bins total 100%
- [ ] RLS policies enforced
- [ ] API rate limits respected

### Post-Deployment
- [ ] Frontend loads
- [ ] Wallet connects
- [ ] API endpoints respond
- [ ] Database queries fast (<100ms)
- [ ] Keeper cron running
- [ ] Logs accessible
- [ ] No errors in console
- [ ] SSL certificate valid

## Troubleshooting

### Common Issues

#### Wallet Won't Connect
- Check browser console for errors
- Verify Phantom/Solflare installed
- Try different wallet
- Check RPC endpoint accessible

#### ML Signals Not Generating
- Verify OpenRouter API key
- Check confidence threshold (≥90%)
- Review price history data (need ≥20 points)
- Check model availability

#### Keeper Not Running
- Verify Railway cron configured
- Check environment variables
- Review keeper logs
- Test manual run: `npm run keeper`

#### Database Queries Slow
- Check indexes exist
- Review query plans (EXPLAIN ANALYZE)
- Consider connection pooling
- Upgrade Supabase plan

## Continuous Testing

### GitHub Actions (Optional)
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run lint
```

### Monitoring
- Set up Sentry for error tracking
- Configure Railway metrics
- Enable Supabase query insights
- Monitor OpenRouter usage

## Test Data

### Sample Pool
```sql
INSERT INTO pools (pool_address, token_a, token_b, dex, pool_type, tvl, volume_24h, fee_tier)
VALUES (
  'test_pool_123',
  'SOL',
  'USDC',
  'meteora',
  'dlmm',
  1000000,
  500000,
  0.003
);
```

### Sample Price History
```sql
INSERT INTO price_history (pool_id, price, volume, liquidity, timestamp)
SELECT 
  'POOL_ID',
  1.0 + (random() * 0.2 - 0.1),
  100000 + (random() * 50000),
  1000000,
  NOW() - (interval '1 hour' * generate_series(1, 100))
FROM generate_series(1, 100);
```

## Success Criteria

- ✅ All API endpoints return 200
- ✅ Wallet connection <2s
- ✅ ML predictions <3s
- ✅ Keeper cycle <60s
- ✅ Database queries <100ms
- ✅ Zero critical errors
- ✅ 99% uptime
