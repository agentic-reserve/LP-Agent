# 🚀 Deploy HawkFi to Railway - Step by Step

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git repository initialized
- [ ] Railway account created (https://railway.app)
- [ ] Helius API key (https://dashboard.helius.dev)
- [ ] Supabase project (https://supabase.com)
- [ ] OpenRouter API key (https://openrouter.ai)

## Step 1: Prepare Your Code (5 minutes)

### 1.1 Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial HawkFi HFL platform"
```

### 1.2 Create GitHub Repository
```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hawkfi-hfl.git
git branch -M main
git push -u origin main
```

### 1.3 Verify Build Locally
```bash
npm install
npm run build

# Should create dist/ folder
ls dist/frontend  # Vite output
ls dist/backend   # TypeScript compiled
```

## Step 2: Setup Supabase Database (10 minutes)

### 2.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `hawkfi-hfl`
4. Database Password: (save this!)
5. Region: Choose closest to you
6. Wait for project to initialize (~2 minutes)

### 2.2 Run Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy entire contents of `supabase/schema.sql`
4. Paste and click "Run"
5. Verify tables created: Go to Table Editor

### 2.3 Get API Keys
1. Go to Settings → API
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` `public` key (for frontend)
   - `service_role` key (for backend)

## Step 3: Deploy to Railway (15 minutes)

### 3.1 Install Railway CLI
```bash
npm install -g @railway/cli

# Verify installation
railway --version
```

### 3.2 Login to Railway
```bash
railway login

# Opens browser for authentication
# Click "Authorize" when prompted
```

### 3.3 Create Railway Project
```bash
# In your project directory
railway init

# Choose:
# - "Create new project"
# - Name: hawkfi-hfl
# - Environment: production
```

### 3.4 Link GitHub Repository (Recommended)
```bash
# Option A: Link via CLI
railway link

# Option B: Link via Dashboard
# 1. Go to https://railway.app/dashboard
# 2. Select your project
# 3. Settings → Connect GitHub
# 4. Select your repository
```

### 3.5 Set Environment Variables
```bash
# Set all required variables
railway variables set HELIUS_API_KEY=your_helius_key_here
railway variables set SUPABASE_URL=https://xxxxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_role_key
railway variables set SUPABASE_ANON_KEY=your_anon_key
railway variables set OPENROUTER_API_KEY=sk-or-v1-your_key
railway variables set NODE_ENV=production
railway variables set PORT=3001

# Optional: MagicBlock
railway variables set MAGICBLOCK_RPC=https://devnet.magicblock.app

# Verify variables
railway variables
```

### 3.6 Deploy
```bash
# Deploy current code
railway up

# Or if using GitHub integration, just push:
git push origin main

# Railway will auto-deploy on push
```

### 3.7 Monitor Deployment
```bash
# Watch logs
railway logs

# Check status
railway status

# Get deployment URL
railway domain
```

## Step 4: Configure Custom Domain (Optional)

### 4.1 Generate Railway Domain
```bash
railway domain

# Generates: hawkfi-hfl-production.up.railway.app
```

### 4.2 Add Custom Domain (Optional)
1. Go to Railway dashboard
2. Select your project
3. Settings → Domains
4. Click "Add Domain"
5. Enter your domain: `hawkfi.yourdomain.com`
6. Add CNAME record to your DNS:
   ```
   CNAME hawkfi -> hawkfi-hfl-production.up.railway.app
   ```

## Step 5: Setup Cron Keeper

### 5.1 Verify railway.toml
Your `railway.toml` should have:
```toml
[[services]]
name = "hawkfi-keeper"
[services.cron]
schedule = "*/5 * * * *"
command = "npm run keeper"
```

### 5.2 Enable Cron Service
Railway automatically detects cron configuration from `railway.toml`.

Verify in dashboard:
1. Go to your project
2. You should see two services:
   - `hawkfi-api` (main app)
   - `hawkfi-keeper` (cron)

### 5.3 Monitor Keeper Logs
```bash
# View keeper logs
railway logs --service hawkfi-keeper

# Should see every 5 minutes:
# 🦅 HawkFi Keeper starting...
# ✅ Keeper cycle completed
```

## Step 6: Test Deployment

### 6.1 Health Check
```bash
# Get your Railway URL
RAILWAY_URL=$(railway domain)

# Test health endpoint
curl https://$RAILWAY_URL/health

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

### 6.2 Test API Endpoints
```bash
# Test pools endpoint
curl https://$RAILWAY_URL/api/pools

# Test ML metrics
curl https://$RAILWAY_URL/api/ml/metrics
```

### 6.3 Test Frontend
```bash
# Open in browser
open https://$RAILWAY_URL

# Or manually visit the URL
# Should see HawkFi dashboard
# Connect wallet and test
```

## Step 7: Update Frontend Environment

### 7.1 Set Frontend Variables
```bash
# Add frontend-specific variables
railway variables set VITE_HELIUS_API_KEY=your_helius_key
railway variables set VITE_SUPABASE_URL=https://xxxxx.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your_anon_key
railway variables set VITE_SOLANA_NETWORK=devnet
railway variables set VITE_SOLANA_RPC_HTTP=https://beta.helius-rpc.com/?api-key=your_key
railway variables set VITE_SOLANA_RPC_WS=wss://beta.helius-rpc.com/?api-key=your_key
```

### 7.2 Redeploy
```bash
# Trigger redeploy
railway up

# Or push to GitHub
git push origin main
```

## Troubleshooting

### Build Fails
```bash
# Check logs
railway logs

# Common issues:
# 1. Missing dependencies
npm install --save-dev @types/node

# 2. TypeScript errors
npm run build  # Test locally first

# 3. Environment variables missing
railway variables  # Verify all set
```

### API Returns 500 Errors
```bash
# Check backend logs
railway logs --service hawkfi-api

# Common issues:
# 1. Supabase connection failed
#    → Verify SUPABASE_URL and SUPABASE_SERVICE_KEY

# 2. Helius API key invalid
#    → Check HELIUS_API_KEY

# 3. OpenRouter API key invalid
#    → Check OPENROUTER_API_KEY
```

### Keeper Not Running
```bash
# Check keeper logs
railway logs --service hawkfi-keeper

# Verify cron schedule
cat railway.toml | grep -A 3 "cron"

# Manual test
railway run npm run keeper
```

### Frontend Can't Connect to Backend
```bash
# Check CORS settings in backend/server.ts
# Should allow your Railway domain

# Update if needed:
app.use(cors({
  origin: ['https://your-railway-domain.up.railway.app']
}));
```

## Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] API endpoints respond correctly
- [ ] Frontend loads and displays UI
- [ ] Wallet connection works
- [ ] Can create strategy
- [ ] Keeper logs show successful runs
- [ ] Database tables populated
- [ ] No errors in Railway logs

## Monitoring & Maintenance

### View Logs
```bash
# Real-time logs
railway logs --follow

# Last 100 lines
railway logs --lines 100

# Specific service
railway logs --service hawkfi-keeper
```

### Check Resource Usage
1. Go to Railway dashboard
2. Select your project
3. Metrics tab shows:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request count

### Update Deployment
```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway auto-deploys
# Or manual deploy:
railway up
```

### Rollback Deployment
```bash
# View deployments
railway deployments

# Rollback to previous
railway rollback <deployment-id>
```

## Cost Estimation

### Railway Pricing (as of 2024)
- **Hobby Plan**: $5/month
  - 500 hours execution time
  - 512 MB RAM
  - 1 GB disk
  - Good for testing

- **Pro Plan**: $20/month
  - Unlimited execution time
  - 8 GB RAM
  - 100 GB disk
  - Production ready

### Supabase Pricing
- **Free Tier**:
  - 500 MB database
  - 1 GB file storage
  - 50,000 monthly active users
  - Good for MVP

- **Pro Plan**: $25/month
  - 8 GB database
  - 100 GB storage
  - Unlimited users

### Total Estimated Cost
- **Development**: $0-10/month (free tiers)
- **Production**: $45-50/month (Railway Pro + Supabase Pro)

## Next Steps

1. ✅ Deployed to Railway
2. → Test Percolator integration (see PERCOLATOR_TEST.md)
3. → Add perp positions to dashboard
4. → Experiment with delta-neutral strategies

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Supabase Docs: https://supabase.com/docs
- HawkFi Issues: [Your GitHub Repo]

---

**HawkFi HFL Platform - Production Deployment Complete! 🦅**
