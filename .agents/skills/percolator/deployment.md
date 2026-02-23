# Deployment Guide

## Prerequisites

- Solana CLI installed and configured
- Rust toolchain (latest stable)
- Anchor CLI (if using Anchor)
- Node.js 20+ and pnpm
- Sufficient SOL for deployment and rent

## Building the Programs

### Core Library

```bash
cd percolator
cargo build --release
cargo test
cargo kani  # Optional: formal verification
```

### Solana Program

```bash
cd percolator-prog
cargo build-bpf --release
```

**Output:** `target/deploy/percolator_prog.so`

### Matcher Program

```bash
cd percolator-match
cargo build-bpf --release
```

**Output:** `target/deploy/percolator_match.so`

## Deployment Steps

### 1. Deploy Programs

#### Deploy Main Program

```bash
solana program deploy \
  target/deploy/percolator_prog.so \
  --url <cluster-url> \
  --keypair ~/.config/solana/id.json
```

**Returns:** Program ID (save this!)

#### Deploy Matcher Program

```bash
solana program deploy \
  target/deploy/percolator_match.so \
  --url <cluster-url> \
  --keypair ~/.config/solana/id.json
```

**Returns:** Matcher program ID

### 2. Initialize Market

```bash
# Create slab account
solana-keygen new -o slab-keypair.json

# Initialize market
percolator-cli init-market \
  --slab $(solana-keygen pubkey slab-keypair.json) \
  --mint <token-mint> \
  --vault <vault-pubkey> \
  --oracle <oracle-pubkey> \
  --admin <admin-pubkey>
```

**Parameters:**
- `mint`: Token mint for collateral (e.g., wrapped SOL)
- `vault`: Token account owned by vault PDA
- `oracle`: Pyth or Chainlink price feed
- `admin`: Admin authority pubkey

### 3. Configure Market

```bash
# Set risk parameters
percolator-cli update-config \
  --slab <slab-pubkey> \
  --funding-horizon-slots 7200 \
  --funding-k-bps 100 \
  --funding-scale-notional-e6 1000000000000 \
  --funding-max-premium-bps 500 \
  --funding-max-bps-per-slot 1 \
  --thresh-floor 500 \
  --thresh-risk-bps 1000 \
  --thresh-update-interval-slots 100 \
  --thresh-step-bps 10 \
  --thresh-alpha-bps 1000 \
  --thresh-min 300 \
  --thresh-max 2000 \
  --thresh-min-step 5
```

### 4. Fund Insurance

```bash
percolator-cli topup-insurance \
  --slab <slab-pubkey> \
  --amount <lamports>
```

**Recommended:** 5-10% of expected total capital

### 5. Create Initial LP

```bash
# Using script for atomic creation
npx tsx scripts/add-vamm-lp.ts
```

**Or manually:**

```bash
# 1. Create matcher context
solana-keygen new -o matcher-ctx-keypair.json

# 2. Initialize LP (atomic with matcher init)
# Use custom script to ensure atomicity
```

### 6. Fund Initial LP

```bash
percolator-cli deposit \
  --slab <slab-pubkey> \
  --user-idx <lp-idx> \
  --amount <lamports>
```

**Recommended:** Sufficient liquidity for expected trading volume

### 7. Start Keeper Bot

```bash
# In background or separate terminal
npx tsx scripts/crank-bot.ts &
```

**Or use systemd service:**

```ini
[Unit]
Description=Percolator Keeper Bot
After=network.target

[Service]
Type=simple
User=percolator
WorkingDirectory=/opt/percolator-cli
ExecStart=/usr/bin/npx tsx scripts/crank-bot.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Configuration Files

### CLI Config

`~/.config/percolator-cli.json`:

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "programId": "<your-program-id>",
  "walletPath": "~/.config/solana/id.json"
}
```

### Market Config

Store market parameters in version control:

`config/mainnet-market.json`:

```json
{
  "slab": "<slab-pubkey>",
  "mint": "<mint-pubkey>",
  "oracle": "<oracle-pubkey>",
  "admin": "<admin-pubkey>",
  "riskParams": {
    "maintenanceMarginBps": 500,
    "initialMarginBps": 1000,
    "tradingFeeBps": 10
  },
  "fundingParams": {
    "horizonSlots": 7200,
    "kBps": 100,
    "scaleNotionalE6": "1000000000000",
    "maxPremiumBps": 500,
    "maxBpsPerSlot": 1
  },
  "thresholdParams": {
    "floor": 500,
    "riskBps": 1000,
    "updateIntervalSlots": 100,
    "stepBps": 10,
    "alphaBps": 1000,
    "min": 300,
    "max": 2000,
    "minStep": 5
  }
}
```

## Upgrade Procedure

### 1. Build New Version

```bash
cd percolator-prog
cargo build-bpf --release
```

### 2. Test on Devnet

```bash
# Deploy to devnet
solana program deploy \
  target/deploy/percolator_prog.so \
  --url devnet

# Run full test suite
cd ../percolator-cli
./test-vectors.sh
npx tsx tests/t21-live-trading.ts 10
```

### 3. Upgrade Mainnet

```bash
# Upgrade program
solana program deploy \
  target/deploy/percolator_prog.so \
  --url mainnet-beta \
  --program-id <existing-program-id> \
  --upgrade-authority ~/.config/solana/upgrade-authority.json
```

### 4. Verify Upgrade

```bash
# Check program version
solana program show <program-id> --url mainnet-beta

# Test basic operations
percolator-cli slab:get --slab <slab-pubkey>
```

## Monitoring

### Health Checks

```bash
# Check market health
npx tsx scripts/check-liquidation.ts
npx tsx scripts/check-funding.ts

# Dump state for analysis
npx tsx scripts/dump-state.ts
```

### Metrics to Monitor

1. **Coverage Ratio (`h`)**
   - Alert if < 0.8 (80% backed)
   - Critical if < 0.5 (50% backed)

2. **Insurance Fund**
   - Alert if < 5% of total capital
   - Critical if < 2% of total capital

3. **Oracle Health**
   - Alert if stale (> 60s)
   - Critical if unavailable

4. **Keeper Crank**
   - Alert if not run in 200 slots (~80s)
   - Critical if not run in 500 slots (~200s)

5. **Liquidation Queue**
   - Alert if > 10 accounts liquidatable
   - Critical if > 50 accounts liquidatable

### Alerting

```typescript
// Example monitoring script
async function monitorMarket() {
  const state = await getMarketState(slab);
  
  // Coverage ratio
  const h = state.coverageRatioNum / state.coverageRatioDen;
  if (h < 0.8) {
    alert('Coverage ratio low:', h);
  }
  
  // Insurance fund
  const insurancePct = state.insuranceFund / state.totalCapital;
  if (insurancePct < 0.05) {
    alert('Insurance fund low:', insurancePct);
  }
  
  // Keeper freshness
  const crankAge = currentSlot - state.lastCrankSlot;
  if (crankAge > 200) {
    alert('Keeper crank stale:', crankAge);
  }
  
  // Liquidation queue
  const liquidatable = await getLiquidatableAccounts(slab);
  if (liquidatable.length > 10) {
    alert('Many liquidatable accounts:', liquidatable.length);
  }
}

// Run every 30 seconds
setInterval(monitorMarket, 30000);
```

## Backup and Recovery

### Backup State

```bash
# Regular state backups
npx tsx scripts/dump-state.ts > backups/state-$(date +%Y%m%d-%H%M%S).json
```

### Recovery Procedure

If program becomes unresponsive:

1. **Pause trading** (if admin control available)
2. **Backup current state**
3. **Identify issue** (logs, transactions)
4. **Deploy fix** to devnet and test
5. **Upgrade mainnet** program
6. **Verify state** integrity
7. **Resume trading**

## Security Checklist

Before mainnet deployment:

- [ ] All tests passing (unit, integration, stress)
- [ ] Formal verification proofs passing
- [ ] Security audit completed
- [ ] Bug bounty program active
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Admin keys secured (multisig recommended)
- [ ] Upgrade authority secured
- [ ] Insurance fund adequately capitalized
- [ ] Keeper bot running reliably
- [ ] Oracle health monitoring active
- [ ] Incident response plan documented

## Cost Estimates

### Deployment Costs (Mainnet)

```
Program deployment:     ~5-10 SOL (depending on program size)
Slab account rent:      ~2.5 SOL
Matcher context rent:   ~0.003 SOL per LP
Initial insurance:      Variable (5-10% of expected capital)
```

### Operational Costs

```
Keeper crank:           ~0.000005 SOL per crank (~5 seconds)
                        = ~0.0864 SOL per day
                        = ~2.6 SOL per month

User operations:        ~0.000005 SOL per transaction
```

## Rollback Procedure

If upgrade causes issues:

```bash
# Rollback to previous version
solana program deploy \
  backups/percolator_prog_v1.so \
  --url mainnet-beta \
  --program-id <program-id> \
  --upgrade-authority ~/.config/solana/upgrade-authority.json
```

**Important:** Keep previous program binaries for rollback!

## Post-Deployment

### 1. Verify Deployment

```bash
# Check program
solana program show <program-id>

# Check slab
percolator-cli slab:get --slab <slab-pubkey>

# Test operations
percolator-cli init-user --slab <slab-pubkey>
```

### 2. Announce Launch

- Update documentation with program IDs
- Announce on social media
- Update frontend with new addresses
- Notify users of new market

### 3. Monitor Closely

- Watch for unusual activity
- Monitor error rates
- Check keeper bot health
- Verify oracle updates

## Troubleshooting

### Program Won't Deploy

```bash
# Check program size
ls -lh target/deploy/percolator_prog.so

# If too large, optimize:
cargo build-bpf --release -- -C opt-level=z
```

### Keeper Bot Crashes

```bash
# Check logs
journalctl -u percolator-keeper -f

# Restart
systemctl restart percolator-keeper
```

### Oracle Issues

```bash
# Check oracle account
solana account <oracle-pubkey>

# Test oracle reading
npx tsx scripts/test-oracle.ts
```

## Support

For deployment issues:
- GitHub Issues: https://github.com/aeyakovenko/percolator/issues
- Discord: [community link]
- Email: [support email]

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**

This deployment guide is for educational purposes only. The percolator program has NOT been audited and should NOT be used in production with real funds. Deploy at your own risk.
