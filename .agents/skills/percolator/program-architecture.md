# Percolator Program Architecture

## Program Structure

The Percolator protocol consists of three main Solana programs:

1. **percolator-prog** - Main protocol program
2. **percolator-match** - Matcher programs (passive & vAMM)
3. Custom matchers - User-created pricing programs

## Account Types

### Slab Account

The main market state account.

```rust
pub struct Slab {
    // Header
    pub magic: u64,                    // 0x5045_5243_534c_4142 ("PERCSLAB")
    pub version: u32,
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    
    // Oracle configuration
    pub oracle_index: Pubkey,          // Pyth/Chainlink price feed
    pub oracle_collateral: Pubkey,     // Collateral price feed
    pub oracle_authority: Pubkey,      // Admin price push (testing)
    pub authority_price_e6: u64,
    pub authority_price_timestamp: i64,
    
    // Market state
    pub nonce: u64,                    // Increments on each operation
    pub insurance_fund: u64,           // Insurance fund balance
    pub total_capital: u64,            // Sum of all capital
    pub total_positive_pnl: u64,       // Sum of all positive PnL
    pub coverage_ratio_num: u64,       // h numerator
    pub coverage_ratio_den: u64,       // h denominator
    
    // Risk parameters
    pub maintenance_margin_bps: u32,   // 500 = 5%
    pub initial_margin_bps: u32,       // 1000 = 10%
    pub trading_fee_bps: u32,          // 10 = 0.1%
    
    // Funding configuration
    pub funding_horizon_slots: u64,
    pub funding_k_bps: u32,
    pub funding_scale_notional_e6: u128,
    pub funding_max_premium_bps: u32,
    pub funding_max_bps_per_slot: u32,
    pub last_funding_slot: u64,
    pub funding_rate_bps_per_slot: i32,
    
    // Threshold configuration
    pub thresh_floor: u32,
    pub thresh_risk_bps: u32,
    pub thresh_update_interval_slots: u64,
    pub thresh_step_bps: u32,
    pub thresh_alpha_bps: u32,
    pub thresh_min: u32,
    pub thresh_max: u32,
    pub thresh_min_step: u32,
    pub current_threshold_bps: u32,
    pub last_thresh_update_slot: u64,
    
    // Keeper state
    pub last_crank_slot: u64,
    pub last_full_sweep_start_slot: u64,
    pub keeper_step: u8,               // 0-15 (16-step cycle)
    
    // Account tracking
    pub used_bitmap: [u64; 16],        // 1024 accounts max
    pub accounts: [Account; 1024],
}
```

### Account (User or LP)

Individual trading account within the slab.

```rust
pub struct Account {
    pub owner: Pubkey,                 // Account owner
    pub capital: u64,                  // Withdrawable capital
    pub position: i128,                // Current position (+ long, - short)
    pub entry_price_e6: u64,           // Average entry price
    pub last_funding_slot: u64,        // Last funding application
    pub accumulated_funding: i64,      // Accumulated funding payments
    
    // Warmup state
    pub warmup_amount: u64,            // Amount warming up
    pub warmup_start_slot: u64,        // When warmup started
    pub warmup_duration_slots: u64,    // How long to wait
    
    // Flags
    pub is_lp: bool,                   // LP vs user account
    pub is_liquidatable: bool,         // Cached liquidation status
    
    // Statistics
    pub total_trades: u64,
    pub total_volume: u128,
    pub total_fees_paid: u64,
}
```

### LP PDA

Derived address for LP accounts.

```rust
// Derivation
let (lp_pda, bump) = Pubkey::find_program_address(
    &[
        b"lp",
        slab.key().as_ref(),
        &lp_index.to_le_bytes(),
    ],
    program_id,
);
```

**Purpose:** Signed by percolator during CPI to matcher, proving LP authorization.

## Instruction Set

### User Operations

#### InitUser
```rust
pub fn init_user(
    slab: &mut Slab,
    owner: &AccountInfo,
    payer: &AccountInfo,
) -> ProgramResult
```

Creates a new user account. Charges 0.001 SOL initialization fee.

#### Deposit
```rust
pub fn deposit(
    slab: &mut Slab,
    user_idx: u16,
    owner: &AccountInfo,
    token_account: &AccountInfo,
    amount: u64,
) -> ProgramResult
```

Deposits collateral into user account. Increases capital.

#### Withdraw
```rust
pub fn withdraw(
    slab: &mut Slab,
    user_idx: u16,
    owner: &AccountInfo,
    token_account: &AccountInfo,
    amount: u64,
) -> ProgramResult
```

Withdraws capital from user account. Requires no open positions or sufficient margin.

#### TradeNoCpi
```rust
pub fn trade_nocpi(
    slab: &mut Slab,
    user_idx: u16,
    lp_idx: u16,
    size: i128,
    oracle: &AccountInfo,
) -> ProgramResult
```

Executes trade directly at oracle price (no matcher CPI).

#### TradeCpi
```rust
pub fn trade_cpi(
    slab: &mut Slab,
    user_idx: u16,
    lp_idx: u16,
    size: i128,
    matcher_program: &AccountInfo,
    matcher_ctx: &AccountInfo,
    oracle: &AccountInfo,
) -> ProgramResult
```

Executes trade via matcher CPI for dynamic pricing.

**Flow:**
1. Validate accounts and size
2. Check keeper crank freshness
3. CPI to matcher with LP PDA signature
4. Matcher returns execution price
5. Update positions and capital
6. Apply trading fees

#### CloseAccount
```rust
pub fn close_account(
    slab: &mut Slab,
    idx: u16,
    owner: &AccountInfo,
    receiver: &AccountInfo,
) -> ProgramResult
```

Closes account and reclaims rent. Requires zero position and capital.

### LP Operations

#### InitLp
```rust
pub fn init_lp(
    slab: &mut Slab,
    owner: &AccountInfo,
    payer: &AccountInfo,
) -> ProgramResult
```

Creates a new LP account. Returns LP index.

### Keeper Operations

#### KeeperCrank
```rust
pub fn keeper_crank(
    slab: &mut Slab,
    oracle: &AccountInfo,
) -> ProgramResult
```

Updates market state and processes liquidations.

**16-step cycle:**
- Step 0: Start full sweep, update mark price
- Steps 1-14: Process liquidations (64 accounts per step)
- Step 15: Update funding rate, update threshold

**Per crank:**
- Update mark price from oracle
- Apply funding to accounts
- Check liquidation conditions
- Update coverage ratio
- Advance keeper state

### Admin Operations

#### UpdateAdmin
```rust
pub fn update_admin(
    slab: &mut Slab,
    current_admin: &AccountInfo,
    new_admin: &Pubkey,
) -> ProgramResult
```

Transfers admin authority.

#### SetRiskThreshold
```rust
pub fn set_risk_threshold(
    slab: &mut Slab,
    admin: &AccountInfo,
    threshold_bps: u32,
) -> ProgramResult
```

Updates maintenance margin requirement.

#### TopupInsurance
```rust
pub fn topup_insurance(
    slab: &mut Slab,
    payer: &AccountInfo,
    token_account: &AccountInfo,
    amount: u64,
) -> ProgramResult
```

Adds funds to insurance fund.

#### UpdateConfig
```rust
pub fn update_config(
    slab: &mut Slab,
    admin: &AccountInfo,
    config: MarketConfig,
) -> ProgramResult
```

Updates market configuration (funding, threshold parameters).

#### SetOracleAuthority
```rust
pub fn set_oracle_authority(
    slab: &mut Slab,
    admin: &AccountInfo,
    authority: &Pubkey,
) -> ProgramResult
```

Sets oracle authority for manual price pushing (testing only).

#### PushOraclePrice
```rust
pub fn push_oracle_price(
    slab: &mut Slab,
    authority: &AccountInfo,
    price_usd: f64,
) -> ProgramResult
```

Manually pushes oracle price (requires oracle authority).

## State Machine

### Keeper State Machine

```
Step 0:  Start sweep, update mark price
Step 1:  Process accounts 0-63
Step 2:  Process accounts 64-127
Step 3:  Process accounts 128-191
...
Step 14: Process accounts 832-895
Step 15: Update funding, update threshold
Step 0:  Start new sweep
```

**Sweep duration:** 16 cranks × ~5 seconds = ~80 seconds

### Account Lifecycle

```
1. Init      → Account created, capital = 0
2. Deposit   → Capital increases
3. Trade     → Position opens, capital decreases (fees)
4. Funding   → Capital adjusted by funding payments
5. Trade     → Position closes, profit/loss realized
6. Withdraw  → Capital decreases
7. Close     → Account deleted, rent reclaimed
```

## CPI Architecture

### Matcher CPI Flow

```
User calls TradeCpi
  ↓
Percolator validates accounts
  ↓
Percolator invokes matcher via CPI
  ├─ Signs LP PDA
  ├─ Passes oracle account
  └─ Passes trade size
  ↓
Matcher calculates price
  ├─ Verifies LP PDA signature
  ├─ Reads oracle price
  ├─ Applies pricing logic
  └─ Returns execution price
  ↓
Percolator executes trade
  ├─ Updates positions
  ├─ Applies fees
  └─ Updates capital
```

### Security Boundaries

```
Percolator (Trusted)
  ├─ Account validation
  ├─ Margin checks
  ├─ Fee collection
  └─ State updates

Matcher (Untrusted)
  ├─ Price calculation only
  ├─ Cannot modify state
  └─ Must verify LP PDA signature
```

## Data Layout

### Slab Account Size

```
Header:           256 bytes
Config:           512 bytes
Keeper state:     128 bytes
Bitmap:           128 bytes (16 × u64)
Accounts:         262,144 bytes (1024 × 256 bytes)
Total:            ~263 KB
```

### Account Size

```
Owner:            32 bytes
Capital:          8 bytes
Position:         16 bytes (i128)
Entry price:      8 bytes
Funding state:    24 bytes
Warmup state:     24 bytes
Flags:            2 bytes
Statistics:       32 bytes
Reserved:         110 bytes
Total:            256 bytes
```

## Rent Exemption

```
Slab account:     ~2.5 SOL
User account:     Included in slab
LP account:       Included in slab
Matcher context:  ~0.003 SOL
```

## Compute Budget

Typical compute unit usage:

```
InitUser:         ~5,000 CU
Deposit:          ~10,000 CU
Withdraw:         ~10,000 CU
TradeNoCpi:       ~30,000 CU
TradeCpi:         ~50,000 CU (includes matcher CPI)
KeeperCrank:      ~100,000 CU (varies by liquidations)
```

## Error Codes

```rust
pub enum ErrorCode {
    // Account errors
    AccountNotFound = 0x1000,
    AccountAlreadyExists,
    AccountNotOwned,
    AccountLiquidatable,
    
    // Trading errors
    InsufficientMargin = 0x2000,
    PositionTooLarge,
    TradeTooSmall,
    SlippageExceeded,
    
    // Oracle errors
    StaleOracle = 0x3000,
    ZeroPrice,
    PriceOutOfBounds,
    LowOracleConfidence,
    
    // Keeper errors
    StaleKeeperCrank = 0x4000,
    KeeperStepInvalid,
    
    // Authorization errors
    Unauthorized = 0x5000,
    MissingRequiredSignature,
    InvalidLpPda,
    
    // State errors
    InsufficientBalance = 0x6000,
    InsufficientInsurance,
    InvalidState,
}
```

## Upgrade Path

The program uses a versioned account structure:

```rust
pub const CURRENT_VERSION: u32 = 1;

// On account load
if account.version != CURRENT_VERSION {
    return Err(ErrorCode::VersionMismatch);
}

// On upgrade
pub fn migrate_v1_to_v2(account: &mut Account) {
    // Add new fields
    // Preserve existing data
    account.version = 2;
}
```

## Testing Hooks

For testing, the program exposes additional instructions:

```rust
#[cfg(feature = "testing")]
pub fn set_mark_price(
    slab: &mut Slab,
    admin: &AccountInfo,
    price_e6: u64,
) -> ProgramResult
```

Enable with: `cargo build-bpf --features testing`
