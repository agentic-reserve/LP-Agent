# Oracle Integration

## Supported Oracle Types

Percolator auto-detects oracle type by checking the account owner:

1. **Pyth Network** - Real-time price feeds via PriceUpdateV2
2. **Chainlink** - OCR2 aggregator accounts
3. **Oracle Authority** - Admin-controlled price push (testing only)

## Oracle Priority

```rust
// Priority order:
if oracle_authority != 0 && authority_price_e6 != 0 && timestamp_recent {
    use authority_price
} else if oracle_owner == PYTH_PROGRAM_ID {
    use pyth_price
} else if oracle_owner == CHAINLINK_PROGRAM_ID {
    use chainlink_price
} else {
    error: UnsupportedOracle
}
```

## Pyth Network Integration

### Setup

```typescript
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';

const pythReceiver = new PythSolanaReceiver({
  connection,
  wallet,
});

// Get price feed ID for SOL/USD
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
```

### Reading Pyth Prices

```rust
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, get_feed_id_from_hex};

pub fn read_pyth_price(
    oracle_account: &AccountInfo,
    feed_id: &[u8; 32],
) -> Result<u64, ProgramError> {
    // Deserialize price update
    let price_update = PriceUpdateV2::try_deserialize(&mut &oracle_account.data.borrow()[..])?;
    
    // Get price for feed
    let price_feed = price_update.get_price_no_older_than(
        &Clock::get()?,
        MAX_PRICE_AGE_SECONDS,
        feed_id,
    )?;
    
    // Check confidence
    let confidence_pct = (price_feed.conf as u128 * 100) / price_feed.price as u128;
    if confidence_pct > MAX_CONFIDENCE_PCT {
        return Err(ProgramError::Custom(ErrorCode::LowOracleConfidence));
    }
    
    // Convert to micro-units (e6)
    let price_e6 = if price_feed.exponent >= 0 {
        (price_feed.price as u64) * 10u64.pow(price_feed.exponent as u32) * 1_000_000
    } else {
        (price_feed.price as u64) * 1_000_000 / 10u64.pow((-price_feed.exponent) as u32)
    };
    
    Ok(price_e6)
}
```

### Pyth Price Feeds

Common feeds:
- SOL/USD: `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`
- BTC/USD: `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
- ETH/USD: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`

Full list: https://pyth.network/developers/price-feed-ids

## Chainlink Integration

### Setup

Chainlink uses OCR2 aggregator accounts on Solana.

```typescript
// Chainlink SOL/USD on devnet
const CHAINLINK_SOL_USD = new PublicKey('99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR');
```

### Reading Chainlink Prices

```rust
use chainlink_solana as chainlink;

pub fn read_chainlink_price(
    oracle_account: &AccountInfo,
) -> Result<u64, ProgramError> {
    // Deserialize aggregator data
    let round_data = chainlink::latest_round_data(
        oracle_account.clone(),
    )?;
    
    // Check staleness
    let current_timestamp = Clock::get()?.unix_timestamp;
    let age = current_timestamp - round_data.updated_at;
    if age > MAX_PRICE_AGE_SECONDS {
        return Err(ProgramError::Custom(ErrorCode::StaleOracle));
    }
    
    // Chainlink prices are typically 8 decimals
    // Convert to micro-units (e6)
    let price_e6 = (round_data.answer as u64) / 100;
    
    Ok(price_e6)
}
```

### Chainlink Feeds

Devnet feeds:
- SOL/USD: `99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR`
- BTC/USD: `CzZQBrJCLqjXRfMjRN3fhbxur2QYHUzkpaRwkWsiPqbz`
- ETH/USD: `2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b7Go`

Full list: https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana

## Oracle Authority (Testing Only)

### Purpose

Admin-controlled price pushing for testing scenarios:
- Flash crashes
- ADL triggers
- Stress testing
- Edge case validation

### Setup

```bash
# Set oracle authority (admin only)
percolator-cli set-oracle-authority \
  --slab <slab-pubkey> \
  --authority <authority-pubkey>
```

### Push Price

```bash
# Push SOL price to $143.50
percolator-cli push-oracle-price \
  --slab <slab-pubkey> \
  --price 143.50
```

### Disable

```bash
# Set authority to zero address
percolator-cli set-oracle-authority \
  --slab <slab-pubkey> \
  --authority 11111111111111111111111111111111
```

### Implementation

```rust
pub fn push_oracle_price(
    slab: &mut Slab,
    authority: &AccountInfo,
    price_usd: f64,
) -> ProgramResult {
    // Verify authority
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *authority.key != slab.oracle_authority {
        return Err(ProgramError::Custom(ErrorCode::Unauthorized));
    }
    
    // Validate price
    if price_usd <= 0.0 {
        return Err(ProgramError::Custom(ErrorCode::InvalidPrice));
    }
    
    // Convert to micro-units
    let price_e6 = (price_usd * 1_000_000.0) as u64;
    
    // Store price
    slab.authority_price_e6 = price_e6;
    slab.authority_price_timestamp = Clock::get()?.unix_timestamp;
    
    Ok(())
}
```

## Oracle Validation

### Staleness Check

```rust
pub fn check_oracle_staleness(
    oracle_timestamp: i64,
    max_age_seconds: i64,
) -> Result<(), ProgramError> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let age = current_timestamp - oracle_timestamp;
    
    if age > max_age_seconds {
        return Err(ProgramError::Custom(ErrorCode::StaleOracle));
    }
    
    Ok(())
}
```

**Recommended max age:**
- Mainnet: 60 seconds
- Devnet: 300 seconds (oracles update less frequently)

### Price Bounds Check

```rust
pub fn check_price_bounds(
    price: u64,
    min_price: u64,
    max_price: u64,
) -> Result<(), ProgramError> {
    if price == 0 {
        return Err(ProgramError::Custom(ErrorCode::ZeroPrice));
    }
    
    if price < min_price || price > max_price {
        return Err(ProgramError::Custom(ErrorCode::PriceOutOfBounds));
    }
    
    Ok(())
}
```

**Example bounds for SOL/USD:**
- Min: $1 (1_000_000 e6)
- Max: $10,000 (10_000_000_000 e6)

### Confidence Check (Pyth)

```rust
pub fn check_pyth_confidence(
    price: i64,
    confidence: u64,
    max_confidence_pct: u64,
) -> Result<(), ProgramError> {
    let confidence_pct = (confidence as u128 * 100) / price.abs() as u128;
    
    if confidence_pct > max_confidence_pct as u128 {
        return Err(ProgramError::Custom(ErrorCode::LowOracleConfidence));
    }
    
    Ok(())
}
```

**Recommended max confidence:** 5% (price ± 5%)

### Multi-Oracle Validation

```rust
pub fn validate_multi_oracle(
    price1: u64,
    price2: u64,
    max_deviation_pct: u64,
) -> Result<u64, ProgramError> {
    let diff = (price1 as i128 - price2 as i128).abs();
    let avg = (price1 + price2) / 2;
    let deviation_pct = (diff as u128 * 100) / avg as u128;
    
    if deviation_pct > max_deviation_pct as u128 {
        return Err(ProgramError::Custom(ErrorCode::OracleMismatch));
    }
    
    // Return average
    Ok(avg)
}
```

**Recommended max deviation:** 5%

## Inverted Markets

For inverted markets (e.g., SOL/USD with SOL collateral), the price is inverted:

```rust
pub fn invert_price(price_e6: u64) -> u64 {
    // price = 1 / oracle_price
    // If oracle = $100, inverted = 0.01 SOL
    (1_000_000_000_000u128 / price_e6 as u128) as u64
}
```

**Example:**
- Oracle: $100 SOL/USD
- Inverted: 0.01 SOL/USD (100 USD = 1 SOL)

## Oracle Update Frequency

### Pyth Network
- Mainnet: ~400ms (sub-second)
- Devnet: ~1-2 seconds

### Chainlink
- Mainnet: ~1-5 minutes (depending on deviation threshold)
- Devnet: ~5-10 minutes

### Oracle Authority
- On-demand (manual push)

## Error Handling

```rust
#[derive(Debug, Clone, Copy)]
pub enum OracleError {
    StaleOracle,
    ZeroPrice,
    PriceOutOfBounds,
    LowOracleConfidence,
    OracleMismatch,
    UnsupportedOracle,
    InvalidOracleAccount,
}
```

## Best Practices

1. **Always validate** oracle prices before use
2. **Check staleness** based on update frequency
3. **Use confidence intervals** (Pyth) to filter unreliable prices
4. **Implement bounds** to prevent extreme prices
5. **Consider multi-oracle** validation for critical operations
6. **Monitor oracle health** in production
7. **Have fallback** mechanisms for oracle failures
8. **Test edge cases** (stale, zero, extreme prices)

## Testing Oracle Integration

```typescript
test('oracle price validation', async () => {
  // Test stale price
  await assert.rejects(
    () => trade(slab, userIdx, lpIdx, 1000, { oracleAge: 1000 }),
    /StaleOracle/
  );
  
  // Test zero price
  await assert.rejects(
    () => trade(slab, userIdx, lpIdx, 1000, { oraclePrice: 0 }),
    /ZeroPrice/
  );
  
  // Test extreme price
  await assert.rejects(
    () => trade(slab, userIdx, lpIdx, 1000, { oraclePrice: 1_000_000_000_000 }),
    /PriceOutOfBounds/
  );
  
  // Test low confidence
  await assert.rejects(
    () => trade(slab, userIdx, lpIdx, 1000, { oracleConfidence: 0.1 }),
    /LowOracleConfidence/
  );
});
```

## Monitoring

Monitor oracle health in production:

```typescript
async function monitorOracle(oraclePubkey: PublicKey) {
  const account = await connection.getAccountInfo(oraclePubkey);
  const price = parseOraclePrice(account);
  
  // Check staleness
  const age = Date.now() / 1000 - price.timestamp;
  if (age > 60) {
    alert('Oracle stale!');
  }
  
  // Check bounds
  if (price.value < MIN_PRICE || price.value > MAX_PRICE) {
    alert('Oracle price out of bounds!');
  }
  
  // Check confidence (Pyth)
  if (price.confidence / price.value > 0.05) {
    alert('Oracle confidence too low!');
  }
}
```
