# Security Considerations

## Critical Security Requirements

### 1. Matcher LP PDA Signature Verification

**CRITICAL:** The most important security check in the entire system.

```rust
// ALWAYS verify LP PDA is a signer
if !lp_pda.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}
```

**Why this matters:**
- Percolator signs the LP PDA via `invoke_signed` during CPI
- If matcher accepts unsigned calls, attackers can bypass LP authorization
- Result: Complete fund theft from LP accounts

**Attack scenario without check:**
```
1. Attacker creates malicious matcher
2. Matcher doesn't verify LP PDA signature
3. Attacker calls matcher directly (not via percolator CPI)
4. Matcher returns favorable price
5. Attacker drains LP funds
```

### 2. Atomic Matcher Context Creation

**CRITICAL:** Must create matcher context AND initialize LP in ONE transaction.

```typescript
// CORRECT: Atomic creation
const tx = new Transaction()
  .add(createMatcherContext)
  .add(initMatcherContext)
  .add(initLp);
await sendAndConfirmTransaction(connection, tx, signers);

// WRONG: Separate transactions (race condition)
await createMatcherContext();
await initMatcherContext(); // Attacker can front-run here!
await initLp();
```

**Attack scenario without atomicity:**
```
1. You create matcher context account
2. Attacker sees pending transaction
3. Attacker front-runs with their own init (using their LP PDA)
4. Your init fails (already initialized)
5. Attacker controls your matcher context
6. Attacker can manipulate pricing
```

### 3. Oracle Price Validation

Always validate oracle prices before use.

```rust
// Check staleness
let current_slot = Clock::get()?.slot;
let oracle_age = current_slot - oracle.last_update_slot;
if oracle_age > MAX_ORACLE_AGE_SLOTS {
    return Err(ProgramError::Custom(ErrorCode::StaleOracle));
}

// Check price bounds
if oracle_price == 0 {
    return Err(ProgramError::Custom(ErrorCode::InvalidOraclePrice));
}
if oracle_price > MAX_REASONABLE_PRICE {
    return Err(ProgramError::Custom(ErrorCode::InvalidOraclePrice));
}

// Check confidence (for Pyth)
if oracle.confidence > oracle.price / 100 {
    return Err(ProgramError::Custom(ErrorCode::LowOracleConfidence));
}
```

**Attack vectors:**
- Stale price manipulation
- Zero price (division by zero)
- Extreme prices (overflow)
- Low confidence (unreliable)

### 4. Integer Arithmetic Safety

Use checked arithmetic or wider types.

```rust
// WRONG: Can overflow
let result = a * b / c;

// RIGHT: Checked arithmetic
let result = a.checked_mul(b)
    .ok_or(ProgramError::ArithmeticOverflow)?
    .checked_div(c)
    .ok_or(ProgramError::DivisionByZero)?;

// RIGHT: Wider types
let result = ((a as u128) * (b as u128) / (c as u128)) as u64;
```

**Common overflow scenarios:**
- Price * size calculations
- Funding rate accumulation
- PnL calculations
- Margin requirement checks

### 5. Access Control

Verify account ownership and authorization.

```rust
// Verify signer
if !authority.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}

// Verify admin
if *authority.key != slab.admin {
    return Err(ProgramError::Custom(ErrorCode::Unauthorized));
}

// Verify account owner
if account.owner != expected_owner {
    return Err(ProgramError::IllegalOwner);
}

// Verify PDA derivation
let (expected_pda, bump) = Pubkey::find_program_address(seeds, program_id);
if *pda.key != expected_pda {
    return Err(ProgramError::InvalidSeeds);
}
```

### 6. Reentrancy Protection

Prevent reentrancy attacks on state-changing operations.

```rust
// Use reentrancy guard
if slab.is_locked {
    return Err(ProgramError::Custom(ErrorCode::Reentrancy));
}
slab.is_locked = true;

// Perform operation
let result = perform_withdrawal(slab, account, amount)?;

// Release lock
slab.is_locked = false;

Ok(result)
```

**Vulnerable operations:**
- Withdrawals
- Liquidations
- CPI calls to external programs

### 7. State Consistency

Ensure state updates are atomic and consistent.

```rust
// WRONG: Partial state update
account.capital -= amount;
// If this fails, capital is already decreased!
vault.transfer(amount)?;

// RIGHT: Validate first, update after
vault.transfer(amount)?;
account.capital -= amount;

// BETTER: Use transaction-like pattern
let mut updates = StateUpdates::new();
updates.decrease_capital(account_id, amount);
updates.transfer_from_vault(amount);
updates.commit()?; // All or nothing
```

## Common Attack Vectors

### 1. Front-Running

**Attack:** Attacker sees pending transaction and submits their own with higher priority fee.

**Mitigation:**
- Use slippage limits on trades
- Implement time-weighted average pricing
- Use private mempools (Jito, etc.)

```rust
// Slippage protection
let max_price = oracle_price * (10000 + slippage_bps) / 10000;
if exec_price > max_price {
    return Err(ProgramError::Custom(ErrorCode::SlippageExceeded));
}
```

### 2. Sandwich Attacks

**Attack:** Attacker front-runs with large trade, victim trades at worse price, attacker back-runs to profit.

**Mitigation:**
- Price impact limits
- Maximum fill size per trade
- Inventory-based pricing adjustments

```rust
// Max fill size
if size.abs() > max_fill_abs {
    return Err(ProgramError::Custom(ErrorCode::FillTooLarge));
}

// Price impact limit
let impact_bps = calculate_impact(size, liquidity);
if impact_bps > max_impact_bps {
    return Err(ProgramError::Custom(ErrorCode::ImpactTooHigh));
}
```

### 3. Oracle Manipulation

**Attack:** Manipulate oracle price to trigger liquidations or get favorable trade prices.

**Mitigation:**
- Use multiple oracle sources
- Implement price bounds
- Time-weighted average prices
- Confidence intervals

```rust
// Multi-oracle validation
let price1 = read_oracle(oracle1)?;
let price2 = read_oracle(oracle2)?;
let diff = (price1 as i64 - price2 as i64).abs();
if diff > price1 / 20 {
    return Err(ProgramError::Custom(ErrorCode::OracleMismatch));
}
```

### 4. Liquidation Sniping

**Attack:** Monitor for accounts near liquidation, manipulate price to trigger liquidation, profit from liquidation.

**Mitigation:**
- Dynamic threshold system (harder to liquidate when stressed)
- Liquidation delays
- Partial liquidations
- Liquidation penalties

```rust
// Dynamic threshold
let risk_score = calculate_risk_score(market);
let threshold = base_threshold + (risk_score * risk_multiplier);

// Liquidation delay
if account.last_trade_slot + LIQUIDATION_DELAY > current_slot {
    return Err(ProgramError::Custom(ErrorCode::LiquidationDelayActive));
}
```

### 5. Funding Rate Manipulation

**Attack:** Open large position to skew funding rate, profit from funding payments.

**Mitigation:**
- Cap funding rates
- Cap funding rate changes per slot
- Require minimum position duration

```rust
// Cap funding rate
let funding_rate = calculate_funding_rate(oi_imbalance);
let funding_rate = clamp(funding_rate, -MAX_FUNDING_RATE, MAX_FUNDING_RATE);

// Cap rate change
let rate_change = funding_rate - last_funding_rate;
let rate_change = clamp(rate_change, -MAX_RATE_CHANGE, MAX_RATE_CHANGE);
```

### 6. Dust Attacks

**Attack:** Create many small positions to bloat state or cause rounding errors.

**Mitigation:**
- Minimum position size
- Minimum trade size
- Account rent requirements

```rust
// Minimum trade size
if size.abs() < MIN_TRADE_SIZE {
    return Err(ProgramError::Custom(ErrorCode::TradeTooSmall));
}

// Minimum position size (or zero)
if account.position.abs() > 0 && account.position.abs() < MIN_POSITION_SIZE {
    return Err(ProgramError::Custom(ErrorCode::PositionTooSmall));
}
```

### 7. Sybil Attacks

**Attack:** Create many accounts to game profit distribution or voting.

**Mitigation:**
- Account creation fees
- Minimum capital requirements
- Rate limiting

```rust
// Account creation fee
let fee = ACCOUNT_CREATION_FEE;
vault.transfer_from(payer, fee)?;
insurance_fund.balance += fee;

// Minimum capital
if account.capital < MIN_CAPITAL {
    return Err(ProgramError::Custom(ErrorCode::InsufficientCapital));
}
```

## Security Checklist

### Pre-Deployment

- [ ] All arithmetic uses checked operations or wider types
- [ ] All oracle prices validated (staleness, bounds, confidence)
- [ ] All access control checks implemented
- [ ] All PDA derivations verified
- [ ] All CPI calls use correct signers
- [ ] Reentrancy guards on state-changing operations
- [ ] State updates are atomic and consistent
- [ ] Error handling covers all edge cases
- [ ] No unsafe code in critical paths
- [ ] Formal verification proofs passing

### Matcher-Specific

- [ ] LP PDA signature verification implemented
- [ ] LP PDA stored in context during init
- [ ] Atomic creation script tested
- [ ] Return data format correct
- [ ] Price calculations tested with edge cases
- [ ] Integer overflow protection on all arithmetic
- [ ] Max fill size enforced
- [ ] Inventory limits enforced (if applicable)

### Testing

- [ ] Unit tests cover all functions
- [ ] Integration tests cover all user flows
- [ ] Stress tests cover worst-case scenarios
- [ ] Security pen-tests completed
- [ ] Fuzzing tests run (if applicable)
- [ ] All tests passing on devnet

### Monitoring

- [ ] Oracle price monitoring
- [ ] Liquidation monitoring
- [ ] Coverage ratio monitoring
- [ ] Insurance fund monitoring
- [ ] Anomaly detection (unusual trades, positions)
- [ ] Alert system for critical events

## Incident Response

### 1. Detection

Monitor for:
- Unusual price movements
- Large liquidations
- Coverage ratio drops
- Insurance fund depletion
- Abnormal trading patterns

### 2. Response

If attack detected:
1. **Pause trading** (if admin control available)
2. **Investigate** transaction logs
3. **Identify** attack vector
4. **Mitigate** by updating parameters or code
5. **Communicate** with users

### 3. Recovery

After incident:
1. **Analyze** root cause
2. **Fix** vulnerability
3. **Test** fix thoroughly
4. **Deploy** updated code
5. **Resume** operations
6. **Post-mortem** report

## Security Resources

### Auditing

- **Recommended auditors:**
  - Trail of Bits
  - Kudelski Security
  - Zellic
  - OtterSec
  - Neodyme

### Bug Bounties

Consider running a bug bounty program:
- Immunefi
- HackerOne
- Code4rena

### Security Tools

- **Kani**: Formal verification
- **Anchor**: Security-focused framework
- **Soteria**: Solana security scanner
- **Sec3**: Automated security analysis

### Best Practices

- Follow Solana security best practices: https://docs.solana.com/developing/programming-model/security
- Review Anchor security guidelines: https://www.anchor-lang.com/docs/security
- Study past exploits: https://github.com/SunWeb3Sec/DeFiHackLabs

## Responsible Disclosure

If you discover a security vulnerability:

1. **Do NOT** disclose publicly
2. **Do NOT** exploit the vulnerability
3. **Contact** the team privately
4. **Provide** detailed information
5. **Wait** for fix before disclosure

## Disclaimer

⚠️ **EDUCATIONAL RESEARCH PROJECT**

This code has NOT been audited. Do NOT use in production or with real funds. The percolator program is experimental software provided for learning and testing purposes only. Use at your own risk.
