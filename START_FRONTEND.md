# 🚀 Start HawkFi Frontend

## Quick Start

### Step 1: Install Dependencies (First Time Only)

```bash
npm install
```

This will take 2-3 minutes. Wait for it to complete.

### Step 2: Start Frontend

```bash
npm run dev:frontend
```

Or start both frontend and backend:

```bash
npm run dev
```

### Step 3: Open in Browser

The frontend will be available at:
```
http://localhost:5173
```

## Expected Output

When running successfully, you should see:

```
  VITE v6.0.5  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Troubleshooting

### Issue: `vite: not found`

**Solution**: Install dependencies first
```bash
npm install
```

### Issue: `Port 5173 already in use`

**Solution**: Kill the existing process or use a different port
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev:frontend -- --port 5174
```

### Issue: `Cannot find module '@solana/wallet-adapter-react'`

**Solution**: Install dependencies
```bash
npm install
```

### Issue: Build errors

**Solution**: Clean install
```bash
rm -rf node_modules package-lock.json
npm install
```

## What You'll See

### 1. Landing Page (Not Connected)
- HawkFi logo and branding
- "Connect Wallet" button
- Welcome message

### 2. Dashboard (After Connecting Wallet)
- **LP Positions Tab**: Your liquidity positions
- **Perp Positions Tab**: Your perpetual positions
- **Strategies Tab**: Create and manage strategies
- **ML Signals Tab**: AI predictions

## Development Mode Features

- ⚡ Hot Module Replacement (HMR)
- 🔄 Instant updates on file changes
- 🐛 Source maps for debugging
- 📊 Dev tools in browser console

## Environment Variables

Make sure your `.env` file has:

```bash
# Frontend variables (VITE_ prefix)
VITE_HELIUS_API_KEY=your_helius_key
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_HTTP=https://beta.helius-rpc.com/?api-key=xxx
VITE_SOLANA_RPC_WS=wss://beta.helius-rpc.com/?api-key=xxx
```

## Testing the Frontend

### 1. Connect Wallet
- Click "Connect Wallet"
- Select Phantom or Solflare
- Approve connection

### 2. View Positions
- Go to "LP Positions" tab
- Should show empty state if no positions

### 3. Create Strategy
- Go to "Strategies" tab
- Click "+ Create New Strategy"
- Fill in form and submit

### 4. Check ML Signals
- Go to "ML Signals" tab
- View AI predictions and metrics

## Build for Production

```bash
# Build frontend
npm run build

# Output will be in dist/frontend/
ls dist/frontend
```

## Common Commands

```bash
# Start frontend only
npm run dev:frontend

# Start both frontend + backend
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Browser Console

Open browser DevTools (F12) to see:
- Wallet connection logs
- API requests
- React component tree
- Network activity

## Next Steps

1. ✅ Frontend running on http://localhost:5173
2. → Connect your wallet (Phantom/Solflare)
3. → Start backend: `npm run dev:backend`
4. → Create your first strategy

## Full Stack Development

To run everything:

```bash
# Terminal 1: Frontend
npm run dev:frontend

# Terminal 2: Backend
npm run dev:backend

# Or in one terminal:
npm run dev
```

---

**HawkFi Frontend Ready! 🦅**

*Visit http://localhost:5173 to get started*
