# 🚀 HawkFi HFL - Quick Start Guide

## 5-Minute Setup

### 1. Clone & Install (1 min)
```bash
git clone <your-repo>
cd hawkfi-hfl-platform
npm install
```

### 2. Get API Keys (2 min)

#### Helius
1. Visit https://dashboard.helius.dev
2. Sign up / Login
3. Create API key
4. Copy key

#### Supabase
1. Visit https://supabase.com
2. Create new project
3. Copy URL and anon key from Settings → API
4. Copy service role key (for backend)

#### OpenRouter
1. Visit https://openrouter.ai
2. Sign up / Login
3. Go to Settings → Keys
4. Create API key
5. Copy key

### 3. Configure Environment (1 min)
```bash
cp .env.example .env
```

Edit `.env`:
```bash
HELIUS_API_KEY=your_helius_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

### 4. Setup Database (1 min)
1. Open Supabase SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Paste and run
4. Verify tables created

### 5. Start Development (<1 min)
```bash
npm run dev
```

Visit http://localhost:5173 🎉

## First Steps

### Connect Wallet
1. Click "Connect Wallet" button
2. Select Phantom or Solflare
3. Approve connection

### Create Strategy
1. Go to "Strategies" tab
2. Click "+ Create New Strategy"
3. Fill form:
   - Name: "My First HFL"
   - Type: HFL
   - Bins: 69
   - Enable MCU: ✓
   - Auto Rebalance: ✓
   - ML Signals: ✓
4. Click "Create Strategy"

### Monitor ML Signals
1. Go to "ML Signals" tab
2. View AI predictions
3. Check confidence scores (≥90%)

### Test Keeper
```bash
npm run keeper
```

## Common Commands

```bash
# Development
npm run dev              # Start frontend + backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Production
npm run build            # Build for production
npm start                # Run production server

# Testing
npm run keeper           # Test keeper manually
curl localhost:3001/health  # Test API

# Deployment
railway login            # Login to Railway
railway up               # Deploy
```

## Troubleshooting

### Wallet Won't Connect
- Install Phantom: https://phantom.app
- Or Solflare: https://solflare.com
- Refresh page and try again

### API Errors
- Check `.env` file has all keys
- Verify keys are valid
- Check Supabase project is active

### Database Errors
- Verify schema.sql ran successfully
- Check Supabase connection
- Review RLS policies

### Keeper Not Running
- Check environment variables
- Verify Supabase connection
- Review logs for errors

## Next Steps

1. Read [README.md](README.md) for full documentation
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. Check [DEPLOYMENT.md](DEPLOYMENT.md) for Railway deploy
4. See [TESTING.md](TESTING.md) for testing procedures

## Support

- GitHub Issues: [Your Repo]
- Discord: [Your Server]
- Telegram: @daemonprotocol888

## Resources

- HawkFi Docs: https://hawkfi.gitbook.io
- Helius Docs: https://docs.helius.dev
- Supabase Docs: https://supabase.com/docs
- OpenRouter: https://openrouter.ai

---

**Built with 🦅 by HawkFi Team**
