# Matcher Development Guide

## What is a Matcher?

A matcher is a Solana program that determines trade pricing for LP positions. When a user trades via `trade-cpi`, the percolator program calls the matcher via CPI to get the execution price.

## Matcher Interface

### Required Instructions

#### 1. Init (tag `0x02`)
Initialize matcher context and store LP PDA for security.

```rust
pub fn init(
    lp_pda: &AccountInfo,      // LP PDA (must verify)
    ctx: &AccountInfo,          // Matcher context account
    payer: &AccountInfo,        // Fee payer
) -> ProgramResult {
    // Store LP PDA in context for verification
    let mut ctx_data = ctx.try_borrow_mut_data()?;
    ctx_data[16..48].copy_from_slice(&lp_pda.key.to_bytes());
    Ok(())
}
```

#### 2. Match (tag `0x00`)
Called by percolator during trade execution to determine price.

```rust
pub fn match_trade(
    lp_pda: &AccountInfo,       // LP PDA (MUST be signer)
    ctx: &AccountInfo,          // Matcher context
    oracle: &AccountInfo,       // Price oracle
    size: i128,                 // Trade size (negative = sell)
) -> ProgramResult {
    // CRITICAL: Verify LP PDA signature
    if !lp_pda.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify LP PDA matches stored PDA
    let ctx_data = ctx.try_borrow_data()?;
    let stored_pda = Pubkey::new_from_array(ctx_data[16..48].try_into().unwrap());
    if *lp_pda.key != stored_pda {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Calculate execution price
    let oracle_price = read_oracle_price(oracle)?;
    let exec_price = calculate_price(oracle_price, size, ctx)?;
    
    // Return price via account data (first 8 bytes)
    let mut return_data = [0u8; 8];
    return_data.copy_from_slice(&exec_price.to_le_bytes());
    set_return_data(&return_data);
    
    Ok(())
}
```

## Security Requirements

### CRITICAL: LP PDA Signature Verification

**Why this matters:** The percolator program signs the LP PDA via `invoke_signed` during CPI. If your matcher accepts unsigned calls, attackers can bypass LP authorization and steal funds.

```rust
// ALWAYS check this
if !lp_pda.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}
```

### CRITICAL: Atomic Creation

You MUST create the matcher context AND initialize the LP in a single atomic transaction. This prevents race conditions where an attacker could initialize your context with their LP PDA.

```typescript
// Find the FIRST FREE slot (match percolator's bitmap scan)
const usedSet = new Set(parseUsedIndices(slabData));
let lpIndex = 0;
while (usedSet.has(lpIndex)) {
  lpIndex++;
}

// Derive LP PDA for the index we'll create
const [lpPda] = deriveLpPda(PROGRAM_ID, SLAB, lpIndex);

// ATOMIC: All three in ONE transaction
const atomicTx = new Transaction().add(
  // 1. Create matcher context account
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: matcherCtxKp.publicKey,
    lamports: rent,
    space: 320,
    programId: MATCHER_PROGRAM_ID,
  }),
  
  // 2. Initialize matcher context WITH LP PDA
  {
    programId: MATCHER_PROGRAM_ID,
    keys: [
      { pubkey: lpPda, isSigner: false, isWritable: false },
      { pubkey: matcherCtxKp.publicKey, isSigner: false, isWritable: true },
    ],
    data: initMatcherData,
  },
  
  // 3. Initialize LP in percolator
  buildIx({ programId: PROGRAM_ID, keys: initLpKeys, data: initLpData })
);

await sendAndConfirmTransaction(conn, atomicTx, [payer, matcherCtxKp]);
```

## Matcher Types

### Passive Matcher (Fixed Spread)

Simple bid/ask spread around oracle price.

```rust
pub fn calculate_passive_price(
    oracle_price: u64,
    size: i128,
    spread_bps: u32,
) -> u64 {
    if size > 0 {
        // Buying: pay ask (oracle + spread)
        oracle_price + (oracle_price * spread_bps as u64) / 10000
    } else {
        // Selling: receive bid (oracle - spread)
        oracle_price - (oracle_price * spread_bps as u64) / 10000
    }
}
```

**Example:** 50bps spread
- Oracle: $100
- Buy: $100.50 (pay 0.5% above oracle)
- Sell: $99.50 (receive 0.5% below oracle)

### vAMM Matcher (Dynamic Pricing)

Spread + impact pricing based on trade size and liquidity depth.

```rust
pub struct VammConfig {
    trading_fee_bps: u32,        // Fee on fills (e.g., 5 = 0.05%)
    base_spread_bps: u32,        // Minimum spread (e.g., 10 = 0.10%)
    impact_k_bps: u32,           // Impact at full utilization
    max_total_bps: u32,          // Cap on total cost
    liquidity_notional_e6: u128, // Quoting depth
    max_fill_abs: u128,          // Max fill per trade
}

pub fn calculate_vamm_price(
    oracle_price: u64,
    size: i128,
    inventory: i128,
    config: &VammConfig,
) -> u64 {
    // Base spread
    let spread = config.base_spread_bps;
    
    // Price impact based on size and liquidity
    let size_abs = size.abs() as u128;
    let utilization = (size_abs * 1_000_000) / config.liquidity_notional_e6;
    let impact = (utilization * config.impact_k_bps as u128) / 10000;
    
    // Inventory skew (penalize trades that increase inventory)
    let skew = calculate_inventory_skew(inventory, size);
    
    // Total cost
    let total_bps = spread + impact + skew + config.trading_fee_bps;
    let total_bps = min(total_bps, config.max_total_bps);
    
    // Apply to oracle price
    if size > 0 {
        oracle_price + (oracle_price * total_bps as u64) / 10000
    } else {
        oracle_price - (oracle_price * total_bps as u64) / 10000
    }
}
```

**Example:** vAMM with 5bps fee, 10bps base spread, 100bps impact at full utilization
- Oracle: $100
- Small buy (1% of liquidity): $100.16 (10bps spread + 1bps impact + 5bps fee)
- Large buy (50% of liquidity): $100.65 (10bps spread + 50bps impact + 5bps fee)

## Matcher Context Layout

### Unified Version 3 (Current)

```
Offset  Size  Field                    Description
0       8     magic                    0x5045_5243_4d41_5443 ("PERCMATC")
8       4     version                  3
12      1     kind                     0=Passive, 1=vAMM
13      3     _pad0
16      32    lp_pda                   LP PDA for signature verification
48      4     trading_fee_bps          Fee on fills
52      4     base_spread_bps          Minimum spread
56      4     max_total_bps            Cap on total cost
60      4     impact_k_bps             Impact multiplier
64      16    liquidity_notional_e6    Quoting depth (u128)
80      16    max_fill_abs             Max fill per trade (u128)
96      16    inventory_base           LP inventory state (i128)
112     8     last_oracle_price_e6     Last oracle price
120     8     last_exec_price_e6       Last execution price
128     16    max_inventory_abs        Inventory limit (u128)
144     112   _reserved
```

**Note:** Context data starts at offset 64 in the 320-byte account (first 64 bytes reserved for matcher return data).

## Return Data Format

Matchers return the execution price via Solana's `set_return_data`:

```rust
// Price in micro-units (e6)
let exec_price_e6: u64 = calculate_price(...);

// Return as 8-byte little-endian
let mut return_data = [0u8; 8];
return_data.copy_from_slice(&exec_price_e6.to_le_bytes());
set_return_data(&return_data);
```

## Testing Matchers

### Unit Tests

```rust
#[test]
fn test_passive_spread() {
    let oracle_price = 100_000_000; // $100 in e6
    let spread_bps = 50; // 0.5%
    
    // Buy: should pay 0.5% above oracle
    let buy_price = calculate_passive_price(oracle_price, 1000, spread_bps);
    assert_eq!(buy_price, 100_500_000); // $100.50
    
    // Sell: should receive 0.5% below oracle
    let sell_price = calculate_passive_price(oracle_price, -1000, spread_bps);
    assert_eq!(sell_price, 99_500_000); // $99.50
}
```

### Integration Tests

```typescript
// Test matcher via actual trade
const tx = await buildTradeCpiTx({
  slab: SLAB_PUBKEY,
  userIdx: 0,
  lpIdx: 0,
  size: 1000,
  matcherProgram: MATCHER_PROGRAM_ID,
  matcherCtx: MATCHER_CTX_PUBKEY,
  oracle: ORACLE_PUBKEY,
});

const sig = await sendAndConfirmTransaction(connection, tx, [userKeypair]);

// Verify execution price in transaction logs
const logs = await connection.getTransaction(sig);
const execPrice = parseExecPriceFromLogs(logs);
console.log(`Executed at: $${execPrice / 1_000_000}`);
```

## Advanced Patterns

### Inventory Management

Track LP inventory and adjust pricing to balance risk:

```rust
pub fn update_inventory(
    ctx: &mut MatcherContext,
    size: i128,
) {
    ctx.inventory_base += size;
    
    // Clamp to max inventory
    if ctx.inventory_base.abs() > ctx.max_inventory_abs as i128 {
        // Reject trade or apply extreme pricing
    }
}

pub fn calculate_inventory_skew(
    inventory: i128,
    size: i128,
) -> u32 {
    // Penalize trades that increase inventory
    if (inventory > 0 && size > 0) || (inventory < 0 && size < 0) {
        let skew_factor = inventory.abs() as u32;
        min(skew_factor / 1000, 100) // Cap at 100bps
    } else {
        0 // Reward trades that reduce inventory
    }
}
```

### Time-Weighted Pricing

Adjust spreads based on time of day or volatility:

```rust
pub fn calculate_time_weighted_spread(
    base_spread_bps: u32,
    current_slot: u64,
    volatility: u32,
) -> u32 {
    // Wider spreads during high volatility
    let vol_adjustment = (volatility * 50) / 10000; // 50bps per 100% vol
    
    // Wider spreads during off-hours (fewer LPs online)
    let time_adjustment = if is_off_hours(current_slot) { 20 } else { 0 };
    
    base_spread_bps + vol_adjustment + time_adjustment
}
```

### Multi-Leg Pricing

Price complex trades (e.g., spreads, combos):

```rust
pub fn calculate_spread_price(
    oracle_price_1: u64,
    oracle_price_2: u64,
    size_1: i128,
    size_2: i128,
    config: &VammConfig,
) -> (u64, u64) {
    // Price each leg independently
    let price_1 = calculate_vamm_price(oracle_price_1, size_1, 0, config);
    let price_2 = calculate_vamm_price(oracle_price_2, size_2, 0, config);
    
    // Apply correlation discount (legs offset each other's risk)
    let correlation = 0.8; // 80% correlated
    let discount_bps = ((1.0 - correlation) * 50.0) as u32; // Up to 50bps discount
    
    (
        price_1 - (price_1 * discount_bps as u64) / 10000,
        price_2 - (price_2 * discount_bps as u64) / 10000,
    )
}
```

## Deployment Checklist

- [ ] LP PDA signature verification implemented
- [ ] LP PDA stored in context during init
- [ ] Atomic creation script tested
- [ ] Return data format correct (8-byte u64 little-endian)
- [ ] Price calculations tested with edge cases
- [ ] Integer overflow protection on all arithmetic
- [ ] Oracle staleness checks implemented
- [ ] Max fill size enforced
- [ ] Inventory limits enforced (if applicable)
- [ ] Unit tests passing
- [ ] Integration tests on devnet passing
- [ ] Security review completed

## Common Pitfalls

### 1. Missing Signature Check
```rust
// WRONG: No signature check
pub fn match_trade(lp_pda: &AccountInfo, ...) {
    let price = calculate_price(...);
    // Attacker can call this directly!
}

// RIGHT: Always verify signature
pub fn match_trade(lp_pda: &AccountInfo, ...) {
    if !lp_pda.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let price = calculate_price(...);
}
```

### 2. Non-Atomic Creation
```typescript
// WRONG: Separate transactions
await createMatcherContext(matcherCtx);
await initMatcherContext(matcherCtx, lpPda); // Race condition!
await initLp(lpIdx);

// RIGHT: Single atomic transaction
const tx = new Transaction()
  .add(createMatcherContext)
  .add(initMatcherContext)
  .add(initLp);
await sendAndConfirmTransaction(connection, tx, signers);
```

### 3. Wrong Return Data Format
```rust
// WRONG: Returning f64
let price: f64 = 100.5;
set_return_data(&price.to_le_bytes());

// RIGHT: Returning u64 in micro-units
let price_e6: u64 = 100_500_000; // $100.50
set_return_data(&price_e6.to_le_bytes());
```

### 4. Integer Overflow
```rust
// WRONG: Can overflow
let impact = (size * price * impact_k) / liquidity;

// RIGHT: Use checked arithmetic or wider types
let impact = ((size as u128) * (price as u128) * (impact_k as u128)) / (liquidity as u128);
let impact = u64::try_from(impact).unwrap_or(u64::MAX);
```
