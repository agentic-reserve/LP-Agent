# Percolator Risk Engine

## Core Concepts

### Two Claim Classes

#### Senior Claim: Capital
- User deposits (collateral)
- Always withdrawable (if no open positions)
- Never subject to haircut
- Protected by formal verification

#### Junior Claim: Profit
- Trading gains (positive PnL)
- Not immediately withdrawable
- Must mature through warmup process
- Subject to global coverage ratio `h`

### The Global Coverage Ratio `h`

The coverage ratio determines how much of all profits are actually backed by system residual value.

```rust
// Simplified calculation
let residual = max(0, vault_balance - total_capital - insurance_fund);
let h = min(residual, total_positive_pnl) / total_positive_pnl;
```

**Interpretation:**
- `h = 1.0`: Fully backed (100% of profits withdrawable after warmup)
- `h = 0.5`: 50% backed (only half of profits withdrawable)
- `h = 0.0`: No backing (profits are IOUs only)

### Effective PnL

Each account's effective PnL is their actual PnL multiplied by `h`:

```rust
effective_pnl = floor(max(pnl, 0) * h_num / h_den)
```

All profitable accounts share the same haircut proportionally.

## Profit Warmup Process

Profits must mature into capital through a time-gated warmup:

1. **Initiate Warmup**: User requests to convert profit to capital
2. **Wait Period**: Configurable warmup duration
3. **Payout**: Amount converted = `warmable_amount * h`
4. **Capital Increase**: Matured profit becomes withdrawable capital

### Warmup Mechanics

```rust
// Warmup state per account
struct WarmupState {
    amount: u64,           // Amount warming up
    start_slot: u64,       // When warmup started
    duration_slots: u64,   // How long to wait
}

// Payout calculation
let elapsed = current_slot - start_slot;
if elapsed >= duration_slots {
    let payout = floor(amount * h_num / h_den);
    capital += payout;
    profit -= amount;
}
```

## Withdrawal Constraints

### Capital Withdrawal
```rust
// Can withdraw capital if:
// 1. No open positions OR
// 2. Remaining capital covers margin requirements

let required_margin = abs(position) * mark_price * margin_ratio;
let withdrawable = max(0, capital - required_margin);
```

### Profit Withdrawal
```rust
// Cannot withdraw profit directly
// Must first:
// 1. Initiate warmup
// 2. Wait for warmup period
// 3. Claim matured capital (subject to h)
```

## Liquidation Mechanics

### Margin Requirements

```rust
// Maintenance margin (5%)
let maintenance_margin = abs(position) * mark_price * 0.05;

// Initial margin (10%)
let initial_margin = abs(position) * mark_price * 0.10;
```

### Liquidation Trigger

Account is liquidatable when:
```rust
capital + effective_pnl < maintenance_margin
```

### Liquidation Process

1. **Keeper identifies** liquidatable account
2. **Position closed** at mark price
3. **Loss realized** from account capital
4. **Shortfall** (if any) absorbed by insurance fund
5. **Insurance depleted** → affects `h` for all accounts

### No ADL

Unlike traditional exchanges, Percolator never forcibly closes profitable positions. Instead:
- Insurance depletion reduces `h`
- Profitable accounts can still trade
- Withdrawals are limited by reduced `h`
- System self-heals as conditions improve

## Funding Rate

### Purpose
Funding rates balance long/short open interest by making one side pay the other.

### Calculation

```rust
// Imbalance
let net_oi = long_oi - short_oi;

// Funding premium (capped)
let premium_bps = (net_oi * funding_k_bps) / funding_scale_notional;
let premium_bps = clamp(premium_bps, -funding_max_premium_bps, funding_max_premium_bps);

// Funding rate per slot (capped)
let funding_per_slot = premium_bps / funding_horizon_slots;
let funding_per_slot = clamp(funding_per_slot, -funding_max_bps_per_slot, funding_max_bps_per_slot);
```

### Application

```rust
// Accumulated funding since last update
let slots_elapsed = current_slot - last_funding_slot;
let funding_accumulated = funding_per_slot * slots_elapsed;

// Applied to each account
if position > 0 {
    // Long pays funding
    capital -= abs(position) * mark_price * funding_accumulated / 10000;
} else if position < 0 {
    // Short receives funding
    capital += abs(position) * mark_price * funding_accumulated / 10000;
}
```

## Dynamic Threshold System

The liquidation threshold auto-adjusts based on system stress:

### Threshold Calculation

```rust
// Risk score (0-10000 bps)
let risk_bps = calculate_risk_score(total_capital, insurance, open_interest);

// Threshold adjustment
let target_threshold = thresh_floor + (risk_bps * thresh_risk_bps) / 10000;
let target_threshold = clamp(target_threshold, thresh_min, thresh_max);

// Smooth adjustment (alpha blending)
let new_threshold = (current_threshold * (10000 - thresh_alpha_bps) + target_threshold * thresh_alpha_bps) / 10000;
```

### Purpose
- **High risk** → increase threshold → harder to liquidate → prevent cascades
- **Low risk** → decrease threshold → normal liquidations → capital efficiency

## Conservation Laws

### Total Value Conservation

```rust
// Invariant: Total value in system is conserved
vault_balance == sum(all_capital) + insurance_fund + sum(all_effective_pnl)
```

### Principal Protection

```rust
// Invariant: Capital never decreases except by:
// 1. User withdrawal
// 2. Trading losses
// 3. Funding payments
// 4. Trading fees
// 5. Liquidation losses

// Capital NEVER affected by:
// - Other users' actions
// - Changes in h
// - Profit haircuts
```

### No Teleportation

```rust
// Invariant: Value cannot appear or disappear
// Every increase in one account must come from:
// 1. Deposit (increases vault)
// 2. Trading gain (offset by another's loss)
// 3. Funding payment (offset by another's payment)
```

## Formal Verification

The core risk engine has 145 Kani proofs covering:

### Conservation Proofs
- Total value conservation across operations
- No value creation or destruction
- Vault balance matches sum of claims

### Safety Proofs
- No integer overflow/underflow
- Division by zero prevention
- Array bounds checking

### Correctness Proofs
- Principal protection guarantees
- Isolation between accounts
- Withdrawal constraints enforced

### Example Proof

```rust
#[kani::proof]
fn prove_capital_never_haircut() {
    let mut engine = Engine::new();
    let initial_capital = engine.get_capital(account_id);
    
    // Apply any sequence of operations
    engine.update_coverage_ratio();
    engine.apply_funding();
    engine.liquidate_accounts();
    
    let final_capital = engine.get_capital(account_id);
    
    // Capital only decreases by explicit user actions or losses
    assert!(final_capital <= initial_capital || had_trading_profit);
}
```

## Risk Scenarios

### Scenario 1: Fully Backed System
```
Vault:     1000 SOL
Capital:   800 SOL
Insurance: 50 SOL
Profit:    100 SOL (positive PnL across all accounts)

Residual = 1000 - 800 - 50 = 150 SOL
h = min(150, 100) / 100 = 1.0 (fully backed)
```

### Scenario 2: Stressed System
```
Vault:     1000 SOL
Capital:   900 SOL
Insurance: 10 SOL (depleted by liquidations)
Profit:    200 SOL

Residual = 1000 - 900 - 10 = 90 SOL
h = min(90, 200) / 200 = 0.45 (45% backed)
```

### Scenario 3: Recovery
```
Time passes, losses realized, new deposits arrive:

Vault:     1100 SOL (new deposits)
Capital:   950 SOL
Insurance: 30 SOL (recovered)
Profit:    150 SOL (some losses realized)

Residual = 1100 - 950 - 30 = 120 SOL
h = min(120, 150) / 150 = 0.80 (80% backed, improving!)
```

## Implementation Notes

### Precision
- All calculations use integer math (no floating point)
- Prices in micro-units (e6 = 6 decimals)
- Basis points for percentages (10000 = 100%)
- Careful rounding to prevent dust accumulation

### Gas Optimization
- Batch operations where possible
- Cache frequently accessed values
- Minimize storage reads/writes
- Use efficient data structures

### Security Considerations
- Reentrancy protection on withdrawals
- Oracle price staleness checks
- Overflow protection on all arithmetic
- Access control on admin functions
