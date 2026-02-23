# HawkFi HFL Platform - Architecture

## System Overview

HawkFi is a full-stack Solana LP management platform that combines precision liquidity distribution, ML-powered predictions, and automated rebalancing.

## Component Architecture

### 1. Frontend Layer (React + Vite)

**Technology**: React 18, Vite, Tailwind CSS, @solana/wallet-adapter

**Responsibilities**:
- Wallet connection (Phantom, Solflare)
- Position visualization
- Strategy creation UI
- ML signal dashboard
- Real-time updates

**Key Components**:
```
Dashboard.tsx          # Main layout with tabs
├── PositionsList.tsx  # Active LP positions
├── StrategiesList.tsx # User strategies
├── CreateStrategy.tsx # Strategy creation form
└── MLSignals.tsx      # AI predictions display
```

**State Management**: React hooks (useState, useEffect)
**Styling**: Tailwind with custom HawkFi theme (hawk-primary, hawk-secondary)

### 2. Backend Layer (Express + TypeScript)

**Technology**: Express, TypeScript, Helius SDK, OpenRouter SDK

**Responsibilities**:
- API endpoints for CRUD operations
- ML ensemble orchestration
- Precision curve calculations
- Database interactions
- RPC communication

**Services**:

#### ML Ensemble Service
```typescript
class MLEnsemble {
  - generateSignal()      # Create prediction
  - callModel()           # OpenRouter API
  - saveSignal()          # Persist to DB
  - getActiveSignals()    # Fetch high-confidence signals
}
```

**Models**:
- Primary: minimax/minimax-m2.5
- Fallback: deepseek/deepseek-chat-v3.1
- Confidence threshold: ≥90%

#### Precision Curve Service
```typescript
class PrecisionCurve {
  - generateBins()        # Create 69-bin distribution
  - shouldRebalance()     # Check rebalance trigger
  - applyMCUBias()        # Bullish allocation
  - calculateImpermanentLoss()
  - adjustForVolatility()
}
```

**Algorithm**: Gaussian distribution with configurable concentration factor

### 3. Database Layer (Supabase Postgres)

**Schema Design**:

```
users
├── id (UUID, PK)
├── wallet_address (TEXT, UNIQUE)
└── settings (JSONB)

pools
├── id (UUID, PK)
├── pool_address (TEXT, UNIQUE)
├── token_a, token_b (TEXT)
├── dex (TEXT)
├── tvl, volume_24h (NUMERIC)
└── metadata (JSONB)

positions
├── id (UUID, PK)
├── user_id (FK → users)
├── pool_id (FK → pools)
├── position_address (TEXT, UNIQUE)
├── lower_price, upper_price (NUMERIC)
├── liquidity (NUMERIC)
├── status (TEXT)
└── strategy_id (FK → strategies)

strategies
├── id (UUID, PK)
├── user_id (FK → users)
├── name (TEXT)
├── strategy_type (TEXT)
├── precision_bins (INTEGER)
├── mcu_enabled (BOOLEAN)
├── auto_rebalance (BOOLEAN)
├── ml_enabled (BOOLEAN)
└── config (JSONB)

precision_bins
├── id (UUID, PK)
├── strategy_id (FK → strategies)
├── bin_index (INTEGER)
├── lower_price, upper_price (NUMERIC)
├── liquidity_allocation (NUMERIC)
└── active (BOOLEAN)

ml_signals
├── id (UUID, PK)
├── pool_id (FK → pools)
├── signal_type (TEXT)
├── confidence (NUMERIC)
├── lstm_prediction (JSONB)
├── xgboost_prediction (JSONB)
├── ensemble_result (JSONB)
├── action (TEXT)
└── executed (BOOLEAN)

rebalance_history
├── id (UUID, PK)
├── position_id (FK → positions)
├── old_lower_price, old_upper_price
├── new_lower_price, new_upper_price
├── tx_signature (TEXT)
├── trigger_type (TEXT)
└── success (BOOLEAN)
```

**Indexes**:
- B-tree on wallet_address, pool_address
- Partial indexes on active=true
- Composite index on (pool_id, timestamp) for price_history

**RLS Policies**:
- Users can only access their own data
- Service role bypasses RLS for keeper

### 4. Keeper Service (Cron)

**Schedule**: Every 5 minutes (Railway cron)

**Workflow**:
```
1. Monitor Positions
   ├── Fetch active positions
   ├── Get latest prices
   ├── Check rebalance triggers
   └── Create keeper jobs

2. Generate ML Signals
   ├── Fetch active pools
   ├── Get price history (100 points)
   ├── Call OpenRouter API
   └── Save signals (confidence ≥90%)

3. Execute Pending Jobs
   ├── Fetch pending jobs (priority order)
   ├── Update status to 'processing'
   ├── Execute rebalance/compound
   └── Update status to 'completed'/'failed'
```

**Job Types**:
- `rebalance` - Adjust position bins
- `compound` - Reinvest fees
- `monitor` - Health checks
- `ml_predict` - Generate signals

**Priority Levels** (1-10):
- 10: Stop-loss triggered
- 8: Take-profit triggered
- 7: Auto-rebalance needed
- 5: Routine monitoring

### 5. External Services

#### Helius RPC
- **Endpoint**: https://beta.helius-rpc.com/?api-key=...
- **Usage**: Transaction sending, account fetching, price data
- **Features**: Enhanced transactions, priority fees, webhooks

#### MagicBlock Ephemeral Rollups
- **Endpoint**: https://devnet.magicblock.app
- **Usage**: Low-latency state updates (<10ms)
- **Features**: Gasless transactions, sub-second finality

#### OpenRouter
- **Endpoint**: https://openrouter.ai/api/v1
- **Models**: minimax-m2.5, deepseek-chat-v3.1
- **Usage**: ML predictions, strategy recommendations
- **Cost**: ~$0.001 per prediction

#### Supabase
- **Services**: Postgres, Auth, Realtime
- **Usage**: Data persistence, RLS, subscriptions
- **Backup**: Automated daily backups

## Data Flow

### Position Creation
```
User (Frontend)
  → POST /api/positions
    → Backend validates
      → Supabase insert
        → Return position ID
          → Frontend updates UI
```

### ML Signal Generation
```
Keeper (Cron)
  → Fetch pool data
    → Get price history
      → OpenRouter API call
        → Parse prediction
          → Save to ml_signals
            → Trigger webhook (optional)
```

### Auto Rebalance
```
Keeper detects trigger
  → Create keeper_job
    → Fetch precision bins
      → Calculate new ranges
        → Build Solana transaction
          → Sign with keeper wallet
            → Send via Helius
              → Update rebalance_history
                → Update position status
```

## Security Architecture

### Authentication
- Frontend: Wallet signature verification
- Backend: API key authentication
- Database: Supabase RLS policies

### Authorization
- Users can only access their own positions/strategies
- Keeper uses service role key
- API endpoints validate wallet ownership

### Data Protection
- Environment variables for secrets
- HTTPS only in production
- CORS restricted to frontend domain
- SQL injection prevention (parameterized queries)

### Wallet Security
- No private keys stored
- Transactions signed client-side
- Keeper wallet separate from user wallets

## Performance Optimization

### Frontend
- Code splitting (React.lazy)
- Tailwind CSS purging
- Vite build optimization
- Wallet adapter caching

### Backend
- Connection pooling (Supabase)
- Response caching (Redis optional)
- Batch database queries
- Async/await for I/O

### Database
- Indexed queries
- Materialized views for analytics
- Partitioning for price_history
- Query optimization

### Keeper
- Parallel job processing
- Rate limiting for external APIs
- Exponential backoff on failures
- Job deduplication

## Scalability

### Horizontal Scaling
- Stateless backend (multiple instances)
- Load balancer (Railway)
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase Railway resources
- Supabase Pro plan
- Helius higher tier

### Bottlenecks
- OpenRouter API rate limits (100 req/min)
- Supabase connection limit (default 60)
- Keeper execution time (max 5 min)

## Monitoring & Observability

### Metrics
- API response times
- ML prediction accuracy
- Rebalance success rate
- Keeper job completion time

### Logging
- Structured JSON logs
- Railway log aggregation
- Error tracking (Sentry optional)
- Audit trail in database

### Alerts
- Keeper failures
- ML confidence drops
- Database connection issues
- RPC endpoint downtime

## Disaster Recovery

### Backups
- Supabase: Daily automated backups
- Code: Git repository
- Environment: Documented in .env.example

### Failover
- OpenRouter: Automatic model fallback
- RPC: Multiple Helius endpoints
- Database: Supabase HA setup

### Recovery Procedures
1. Restore database from backup
2. Redeploy from Git
3. Verify environment variables
4. Run health checks
5. Resume keeper

## Future Enhancements

### Phase 2
- Real-time WebSocket updates
- Advanced charting (TradingView)
- Multi-pool strategies
- Social trading features

### Phase 3
- Mobile app (React Native)
- Telegram bot integration
- Advanced ML models (custom LSTM)
- Cross-chain support

### Phase 4
- DAO governance
- Revenue sharing
- Liquidity mining
- Institutional features
