# Testing Strategy

## Testing Layers

### 1. Unit Tests (Rust)

Test core risk engine logic in isolation.

```bash
cd percolator
cargo test
```

**Coverage:**
- Coverage ratio calculations
- Profit warmup mechanics
- Margin calculations
- Funding rate application
- Threshold adjustments

**Example:**
```rust
#[test]
fn test_coverage_ratio_calculation() {
    let vault = 1000;
    let capital = 800;
    let insurance = 50;
    let positive_pnl = 100;
    
    let residual = vault - capital - insurance; // 150
    let h = min(residual, positive_pnl) / positive_pnl; // 1.0
    
    assert_eq!(h, 1.0); // Fully backed
}

#[test]
fn test_stressed_coverage_ratio() {
    let vault = 1000;
    let capital = 900;
    let insurance = 10;
    let positive_pnl = 200;
    
    let residual = vault - capital - insurance; // 90
    let h = min(residual, positive_pnl) / positive_pnl; // 0.45
    
    assert_eq!(h, 0.45); // 45% backed
}
```

### 2. Formal Verification (Kani)

Prove correctness properties mathematically.

```bash
cd percolator
cargo install --locked kani-verifier
cargo kani setup
cargo kani
```

**145 Proofs covering:**
- Conservation laws
- Principal protection
- No integer overflow/underflow
- No division by zero
- Array bounds safety
- Isolation between accounts

**Example Proof:**
```rust
#[kani::proof]
fn prove_principal_never_haircut() {
    let mut engine = kani::any();
    let account_id = kani::any();
    
    let initial_capital = engine.get_capital(account_id);
    
    // Apply any sequence of operations
    engine.update_coverage_ratio();
    
    let final_capital = engine.get_capital(account_id);
    
    // Capital only affected by explicit operations
    // Never by coverage ratio changes
    assert!(final_capital == initial_capital || 
            engine.had_withdrawal(account_id) ||
            engine.had_trading_loss(account_id) ||
            engine.had_funding_payment(account_id));
}
```

### 3. Integration Tests (TypeScript)

Test full transaction flows on devnet.

```bash
cd percolator-cli
pnpm test
```

**Coverage:**
- Account initialization
- Deposits and withdrawals
- Trade execution
- Keeper operations
- Oracle integration

**Example:**
```typescript
import { test } from 'node:test';
import assert from 'node:assert';

test('user can deposit and withdraw', async () => {
  // Initialize user
  const userIdx = await initUser(slab);
  
  // Deposit 0.1 SOL
  await deposit(slab, userIdx, 100_000_000);
  
  // Verify balance
  const account = await getAccount(slab, userIdx);
  assert.equal(account.capital, 100_000_000);
  
  // Withdraw 0.05 SOL
  await withdraw(slab, userIdx, 50_000_000);
  
  // Verify balance
  const accountAfter = await getAccount(slab, userIdx);
  assert.equal(accountAfter.capital, 50_000_000);
});
```

### 4. Live Trading Tests

Simulate real trading scenarios with PnL validation.

```bash
# 3 minutes of random trading
npx tsx tests/t21-live-trading.ts 3
```

**Validates:**
- Trade execution at expected prices
- PnL calculation accuracy
- Funding rate application
- Margin requirement enforcement
- Position tracking

### 5. Stress Tests

Test extreme scenarios and edge cases.

#### Haircut System Stress Test
```bash
npx tsx scripts/stress-haircut-system.ts
```

**Scenarios:**
- Insurance depletion
- Coverage ratio drop
- Profit withdrawal limits
- System recovery

**Validates:**
- Conservation of value
- Principal protection
- Haircut application
- Self-healing mechanics

#### Worst-Case Stress Test
```bash
npx tsx scripts/stress-worst-case.ts
```

**Scenarios:**
- Gap risk (price jumps past liquidation)
- Insurance exhaustion
- Socialized losses
- Cascade liquidations

**Validates:**
- System remains solvent
- No value creation/destruction
- Graceful degradation

#### Oracle Authority Stress Test
```bash
npx tsx scripts/oracle-authority-stress.ts
```

**Scenarios:**
- Flash crash (50% price drop)
- Price manipulation
- Funding rate attacks
- Timestamp manipulation

**Validates:**
- Oracle staleness checks
- Price bounds enforcement
- Funding rate caps
- Liquidation triggers

### 6. Security Pen-Testing

Comprehensive security testing.

```bash
npx tsx scripts/pentest-oracle.ts
```

**Attack Vectors:**
- Oracle manipulation
- Reentrancy attacks
- Integer overflow/underflow
- Division by zero
- Unauthorized access
- Front-running
- MEV extraction

**Validates:**
- Access control
- Input validation
- Arithmetic safety
- State consistency

### 7. Protocol Invariant Tests

Verify protocol-level invariants hold.

```bash
# Price-profit relationship
npx tsx scripts/test-price-profit.ts

# Threshold auto-adjustment
npx tsx scripts/test-threshold-increase.ts

# LP profit realization
npx tsx scripts/test-lp-profit-realize.ts

# Profit withdrawal limits
npx tsx scripts/test-profit-withdrawal.ts
```

**Invariants:**
- `Withdrawable ≤ Backed capital`
- `Vault = Capital + Insurance + Effective PnL`
- `h ≤ 1.0`
- `Margin requirements enforced`

## Testing Best Practices

### 1. Test Isolation

Each test should be independent and not rely on state from other tests.

```typescript
// GOOD: Each test creates its own accounts
test('deposit increases capital', async () => {
  const userIdx = await initUser(slab);
  await deposit(slab, userIdx, 100_000_000);
  // ...
});

// BAD: Tests share state
let globalUserIdx;
test('init user', async () => {
  globalUserIdx = await initUser(slab);
});
test('deposit', async () => {
  await deposit(slab, globalUserIdx, 100_000_000); // Depends on previous test
});
```

### 2. Test Edge Cases

Always test boundary conditions.

```typescript
test('edge cases', async () => {
  // Zero amounts
  await assert.rejects(() => deposit(slab, userIdx, 0));
  
  // Maximum amounts
  await deposit(slab, userIdx, Number.MAX_SAFE_INTEGER);
  
  // Negative amounts (should fail)
  await assert.rejects(() => deposit(slab, userIdx, -100));
  
  // Just below/above thresholds
  await testMarginRequirement(0.049); // Below maintenance
  await testMarginRequirement(0.051); // Above maintenance
});
```

### 3. Test Error Conditions

Verify that invalid operations fail correctly.

```typescript
test('error conditions', async () => {
  // Withdraw more than balance
  await assert.rejects(
    () => withdraw(slab, userIdx, 1_000_000_000),
    /InsufficientBalance/
  );
  
  // Trade without keeper crank
  await assert.rejects(
    () => trade(slab, userIdx, lpIdx, 1000),
    /StaleKeeperCrank/
  );
  
  // Unauthorized admin operation
  await assert.rejects(
    () => updateAdmin(slab, newAdmin, { signer: nonAdmin }),
    /Unauthorized/
  );
});
```

### 4. Use Fixtures

Create reusable test setups.

```typescript
async function setupTestMarket() {
  const slab = await initMarket();
  const oracle = await setupOracle();
  const lpIdx = await initLp(slab);
  await deposit(slab, lpIdx, 10_000_000_000); // Fund LP
  return { slab, oracle, lpIdx };
}

test('trade execution', async () => {
  const { slab, oracle, lpIdx } = await setupTestMarket();
  const userIdx = await initUser(slab);
  await deposit(slab, userIdx, 100_000_000);
  // ...
});
```

### 5. Verify State Changes

Always check that operations have the expected effect.

```typescript
test('trade updates position', async () => {
  const before = await getAccount(slab, userIdx);
  assert.equal(before.position, 0);
  
  await trade(slab, userIdx, lpIdx, 1000);
  
  const after = await getAccount(slab, userIdx);
  assert.equal(after.position, 1000);
  assert(after.capital < before.capital); // Paid fees
});
```

### 6. Test Concurrency

Verify that concurrent operations work correctly.

```typescript
test('concurrent deposits', async () => {
  const user1 = await initUser(slab);
  const user2 = await initUser(slab);
  
  // Execute deposits concurrently
  await Promise.all([
    deposit(slab, user1, 100_000_000),
    deposit(slab, user2, 200_000_000),
  ]);
  
  // Verify both succeeded
  const account1 = await getAccount(slab, user1);
  const account2 = await getAccount(slab, user2);
  assert.equal(account1.capital, 100_000_000);
  assert.equal(account2.capital, 200_000_000);
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test

on: [push, pull_request]

jobs:
  test-rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cd percolator && cargo test
      
  test-kani:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cargo install --locked kani-verifier
      - run: cargo kani setup
      - run: cd percolator && cargo kani
      
  test-cli:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: cd percolator-cli && pnpm install
      - run: cd percolator-cli && pnpm test
```

## Test Coverage Goals

- **Unit tests**: >90% code coverage
- **Integration tests**: All user-facing operations
- **Stress tests**: All critical failure modes
- **Formal verification**: All safety-critical invariants
- **Security tests**: All known attack vectors

## Debugging Failed Tests

### 1. Enable Verbose Logging

```bash
# Rust tests
RUST_LOG=debug cargo test

# TypeScript tests
DEBUG=* npx tsx test/my-test.ts
```

### 2. Use Transaction Simulation

```typescript
// Simulate before sending
const simulation = await connection.simulateTransaction(tx);
console.log('Simulation logs:', simulation.value.logs);
```

### 3. Inspect On-Chain State

```bash
# Dump market state
npx tsx scripts/dump-state.ts

# Check specific account
solana account <account-pubkey> --url devnet
```

### 4. Use Solana Explorer

View transactions in the explorer:
```
https://explorer.solana.com/tx/<signature>?cluster=devnet
```

### 5. Add Assertions

```typescript
// Add intermediate assertions
const before = await getAccount(slab, userIdx);
console.log('Before:', before);

await trade(slab, userIdx, lpIdx, 1000);

const after = await getAccount(slab, userIdx);
console.log('After:', after);

assert(after.position === before.position + 1000, 
  `Expected position ${before.position + 1000}, got ${after.position}`);
```

## Performance Testing

### Benchmark Critical Operations

```rust
#[bench]
fn bench_coverage_ratio_calculation(b: &mut Bencher) {
    let engine = setup_test_engine();
    b.iter(|| {
        engine.calculate_coverage_ratio()
    });
}
```

### Measure Transaction Costs

```typescript
test('measure compute units', async () => {
  const tx = await buildTradeTx(slab, userIdx, lpIdx, 1000);
  const simulation = await connection.simulateTransaction(tx);
  console.log('Compute units:', simulation.value.unitsConsumed);
  
  // Ensure under budget
  assert(simulation.value.unitsConsumed < 200_000);
});
```

## Test Data Management

### Use Realistic Data

```typescript
// GOOD: Realistic amounts
const depositAmount = 50_000_000; // 0.05 SOL
const tradeSize = 1000; // 1000 units

// BAD: Unrealistic amounts
const depositAmount = 1; // Too small
const tradeSize = 1_000_000_000; // Too large
```

### Clean Up After Tests

```typescript
test('cleanup', async () => {
  const userIdx = await initUser(slab);
  
  try {
    // Test operations
    await deposit(slab, userIdx, 100_000_000);
    // ...
  } finally {
    // Clean up
    await closeAccount(slab, userIdx);
  }
});
```
