# HawkFi HFL Platform - Deployment Guide

## Prerequisites

- Node.js 18+ and npm/pnpm
- Helius API key (https://dashboard.helius.dev)
- Supabase project (https://supabase.com)
- OpenRouter API key (https://openrouter.ai)
- Railway account (https://railway.app)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `HELIUS_API_KEY` - Your Helius API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENROUTER_API_KEY` - OpenRouter API key

### 3. Setup Database

Run the Supabase schema:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute supabase/schema.sql in your Supabase SQL editor
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or separately:
npm run dev:frontend  # Vite dev server on :5173
npm run dev:backend   # Express API on :3001
```

### 5. Test Keeper

```bash
npm run keeper
```

## Railway Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Create Railway Project

```bash
railway init
```

### 3. Set Environment Variables

```bash
railway variables set HELIUS_API_KEY=your_key_here
railway variables set SUPABASE_URL=your_url_here
railway variables set SUPABASE_SERVICE_KEY=your_key_here
railway variables set OPENROUTER_API_KEY=your_key_here
railway variables set NODE_ENV=production
```

### 4. Deploy

```bash
# Build and deploy
npm run build
railway up

# Or use Railway GitHub integration for auto-deploy
```

### 5. Setup Cron Keeper

Railway will automatically detect the cron job from `railway.toml`:

```toml
[[services]]
name = "hawkfi-keeper"
[services.cron]
schedule = "*/5 * * * *"  # Every 5 minutes
command = "npm run keeper"
```

## Architecture

### Frontend (Vite + React)
- **Port**: 5173 (dev), served from `/dist/frontend` (prod)
- **Wallet**: @solana/wallet-adapter (Phantom, Solflare)
- **RPC**: Helius Gatekeeper (https://beta.helius-rpc.com)
- **Styling**: Tailwind CSS with custom HawkFi theme

### Backend (Express + TypeScript)
- **Port**: 3001
- **RPC**: Helius SDK + MagicBlock Ephemeral Rollups
- **Database**: Supabase Postgres
- **AI**: OpenRouter (minimax-m2.5 → deepseek-v3.1 fallback)

### Keeper (Cron Service)
- **Schedule**: Every 5 minutes
- **Tasks**:
  - Monitor active positions
  - Generate ML signals (>90% confidence)
  - Execute auto-rebalance
  - Check stop-loss/take-profit triggers

## HawkFi Features

### Precision Curve (69-bin)
- Gaussian liquidity distribution
- Concentrated around current price
- Optimized capital efficiency

### MCU (Market Cap Up-only)
- Bullish bias for up-trending assets
- Increased allocation to upper price bins
- Configurable MCU factor (default 1.3x)

### ML Ensemble
- **Primary**: minimax-m2.5 (OpenRouter)
- **Fallback**: deepseek-chat-v3.1
- **Confidence**: ≥90% threshold
- **Signals**: buy, sell, hold, rebalance

### Risk Management
- Auto-rebalance (configurable threshold)
- Auto-compound fees
- Take-profit triggers
- Stop-loss protection

## API Endpoints

### Positions
- `GET /api/positions/user/:walletAddress` - Get user positions
- `GET /api/positions/:positionId` - Get position details
- `POST /api/positions` - Create new position
- `GET /api/positions/:positionId/check-rebalance` - Check rebalance status

### Strategies
- `GET /api/strategies/user/:walletAddress` - Get user strategies
- `POST /api/strategies` - Create new strategy
- `GET /api/strategies/:strategyId` - Get strategy details
- `POST /api/strategies/:strategyId/regenerate-bins` - Regenerate precision bins

### ML Signals
- `POST /api/ml/signal/:poolId` - Generate ML signal
- `GET /api/ml/signals/:poolId` - Get active signals
- `POST /api/ml/signals/:signalId/execute` - Mark signal executed
- `GET /api/ml/metrics` - Get ML performance metrics

### Pools
- `GET /api/pools` - Get all active pools
- `GET /api/pools/:poolId` - Get pool details with price history

## Monitoring

### Health Check
```bash
curl https://your-app.railway.app/health
```

### Logs
```bash
railway logs
```

### Database
Monitor via Supabase dashboard: https://supabase.com/dashboard

## Troubleshooting

### Wallet Connection Issues
- Ensure Phantom/Solflare is installed
- Check RPC endpoint is accessible
- Verify network (devnet/mainnet)

### ML Signal Failures
- Check OpenRouter API key
- Verify confidence threshold (≥90%)
- Review model fallback logs

### Keeper Not Running
- Check Railway cron configuration
- Verify environment variables
- Review keeper logs

## Security

- Never commit `.env` files
- Use Railway secrets for production
- Enable Supabase RLS policies
- Rotate API keys regularly

## Support

- HawkFi Docs: https://hawkfi.gitbook.io
- Helius Docs: https://docs.helius.dev
- MagicBlock Docs: https://docs.magicblock.gg
- Railway Docs: https://docs.railway.app
