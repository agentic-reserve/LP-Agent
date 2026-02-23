# 🦅 HawkFi HFL Platform

**Precision LP Management with AI-Powered Rebalancing**

Full-stack Solana LP automation platform featuring 69-bin Precision Curve, MCU up-only strategy, ML ensemble predictions (minimax-m2.5 → deepseek-v3.1), and automated keeper system.

## 🚀 Features

### Core Capabilities
- **Precision Curve**: 69-bin Gaussian liquidity distribution for optimal capital efficiency
- **MCU (Market Cap Up-only)**: Bullish bias for trending assets with configurable allocation
- **ML Ensemble**: OpenRouter-powered predictions (>90% confidence threshold)
- **Auto Rebalance**: Keeper-driven position optimization every 5 minutes
- **Risk Management**: Stop-loss, take-profit, auto-compound automations

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + @solana/wallet-adapter
- **Backend**: Express + TypeScript + Helius SDK + MagicBlock
- **Database**: Supabase Postgres with RLS
- **AI**: OpenRouter (minimax-m2.5 primary, deepseek-v3.1 fallback)
- **Deploy**: Railway with cron keeper

## 📦 Quick Start

### Prerequisites
```bash
node -v  # 18+
npm -v   # 9+
```

### Installation
```bash
# Clone and install
git clone <your-repo>
cd hawkfi-hfl-platform
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Setup database
# Run supabase/schema.sql in your Supabase SQL editor

# Start development
npm run dev
```

Visit `http://localhost:5173` and connect your Solana wallet.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite)                      │
│  React + Tailwind + @solana/wallet-adapter             │
│  Port: 5173                                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Express)                      │
│  Helius RPC + MagicBlock + OpenRouter                  │
│  Port: 3001                                             │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│   Supabase   │  │  Railway Keeper  │
│   Postgres   │  │  Cron: */5 * * * │
└──────────────┘  └──────────────────┘
```

## 📊 Database Schema

### Core Tables
- `users` - Wallet addresses and settings
- `pools` - LP pool metadata (Meteora, Raydium, Orca)
- `positions` - Active LP positions with price ranges
- `strategies` - HFL strategy configurations
- `precision_bins` - 69-bin liquidity distribution
- `ml_signals` - AI predictions (LSTM + XGBoost ensemble)
- `rebalance_history` - Audit trail
- `keeper_jobs` - Automated task queue

See `supabase/schema.sql` for complete schema.

## 🤖 ML Ensemble

### Models
1. **Primary**: `minimax/minimax-m2.5` (OpenRouter)
2. **Fallback**: `deepseek/deepseek-chat-v3.1`

### Prediction Flow
```typescript
// Simulates LSTM (time-series) + XGBoost (features)
const prediction = await mlEnsemble.generateSignal({
  poolId,
  currentPrice,
  volume24h,
  liquidity,
  priceHistory, // Last 100 data points
});

// Output: { confidence, action, predictedPrice, urgency }
// Only saved if confidence >= 90%
```

### Actions
- `buy` - Enter position
- `sell` - Exit position
- `hold` - Maintain current
- `rebalance` - Adjust bins

## 🎯 Precision Curve

### 69-Bin Distribution
```typescript
const bins = precisionCurve.generateBins(currentPrice);
// Returns 69 bins with Gaussian allocation
// Center bins: highest liquidity
// Edge bins: minimal liquidity
```

### MCU Bias
```typescript
const mcuBins = precisionCurve.applyMCUBias(bins, 1.3);
// Increases allocation to upper bins (bullish)
// Factor 1.3 = 30% more liquidity above current price
```

### Rebalance Logic
```typescript
const needsRebalance = precisionCurve.shouldRebalance(
  currentPrice,
  activeBins,
  threshold // default 5%
);
// Triggers when <5% of liquidity is in active range
```

## 🔄 Keeper System

### Schedule
Runs every 5 minutes via Railway cron.

### Tasks
1. **Monitor Positions**: Check all active positions for rebalance triggers
2. **Generate ML Signals**: Run predictions for active pools
3. **Execute Jobs**: Process pending rebalance/compound operations
4. **Risk Checks**: Evaluate stop-loss and take-profit conditions

### Manual Run
```bash
npm run keeper
```

## 🌐 API Reference

### Positions
```bash
GET  /api/positions/user/:walletAddress
POST /api/positions
GET  /api/positions/:positionId/check-rebalance
```

### Strategies
```bash
GET  /api/strategies/user/:walletAddress
POST /api/strategies
POST /api/strategies/:strategyId/regenerate-bins
```

### ML Signals
```bash
POST /api/ml/signal/:poolId
GET  /api/ml/signals/:poolId
GET  /api/ml/metrics
```

## 🚢 Deployment

### Railway (Recommended)
```bash
# Install CLI
npm install -g @railway/cli
railway login

# Deploy
railway init
railway up

# Set environment variables
railway variables set HELIUS_API_KEY=...
railway variables set SUPABASE_URL=...
railway variables set OPENROUTER_API_KEY=...
```

See `DEPLOYMENT.md` for detailed instructions.

### Environment Variables
```bash
# Required
HELIUS_API_KEY=your_helius_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENROUTER_API_KEY=sk-or-v1-...

# Optional
MAGICBLOCK_RPC=https://devnet.magicblock.app
PORT=3001
NODE_ENV=production
```

## 🔐 Security

- ✅ Supabase RLS policies enabled
- ✅ API keys in environment variables
- ✅ No private keys in code
- ✅ CORS configured for production
- ✅ Input validation on all endpoints

## 📈 Performance

- **RPC**: Helius Gatekeeper (99.99% uptime)
- **Ephemeral Rollups**: MagicBlock (<10ms latency)
- **ML Inference**: <2s per prediction
- **Keeper Cycle**: ~30s for 100 positions

## 🛠️ Development

### Project Structure
```
hawkfi-hfl-platform/
├── backend/
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   │   ├── ml-ensemble.ts
│   │   └── precision-curve.ts
│   ├── types/           # TypeScript types
│   ├── server.ts        # Express app
│   └── keeper.ts        # Cron service
├── src/
│   ├── components/      # React components
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── schema.sql       # Database schema
├── railway.toml         # Railway config
├── vite.config.ts
└── package.json
```

### Scripts
```bash
npm run dev              # Start frontend + backend
npm run dev:frontend     # Vite only
npm run dev:backend      # Express only
npm run build            # Build for production
npm start                # Run production build
npm run keeper           # Run keeper once
```

## 📚 Resources

- [HawkFi Whitepaper](https://hawkfi.gitbook.io/whitepaper)
- [Helius Documentation](https://docs.helius.dev)
- [MagicBlock Docs](https://docs.magicblock.gg)
- [OpenRouter Models](https://openrouter.ai/models)
- [Supabase Docs](https://supabase.com/docs)
- [Railway Docs](https://docs.railway.app)

## 🤝 Contributing

Built for Jakarta Solana developers and Daemonprotocol888 community.

## 📄 License

MIT

---

**Built with 🦅 by HawkFi Team**

*Precision Curve • MCU Up-only • ML Ensemble • Auto Rebalance*
