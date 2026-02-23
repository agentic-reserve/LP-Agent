-- HawkFi HFL Platform Database Schema
-- Precision LP Management with ML Signals

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- LP Pools table
CREATE TABLE pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_address TEXT UNIQUE NOT NULL,
  token_a TEXT NOT NULL,
  token_b TEXT NOT NULL,
  dex TEXT NOT NULL, -- 'meteora', 'raydium', 'orca'
  pool_type TEXT NOT NULL, -- 'dlmm', 'clmm', 'stable'
  tvl NUMERIC(20, 6),
  volume_24h NUMERIC(20, 6),
  fee_tier NUMERIC(10, 6),
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LP Positions table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  position_address TEXT UNIQUE NOT NULL,
  lower_price NUMERIC(20, 10) NOT NULL,
  upper_price NUMERIC(20, 10) NOT NULL,
  liquidity NUMERIC(30, 10) NOT NULL,
  token_a_amount NUMERIC(30, 10),
  token_b_amount NUMERIC(30, 10),
  unclaimed_fees_a NUMERIC(30, 10) DEFAULT 0,
  unclaimed_fees_b NUMERIC(30, 10) DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'rebalancing'
  strategy_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, position_address)
);

-- HFL Strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pool_id UUID REFERENCES pools(id),
  strategy_type TEXT NOT NULL, -- 'hfl', 'mcu', 'precision_curve', 'pool_sniper'
  
  -- HFL Parameters
  rebalance_threshold NUMERIC(5, 2) DEFAULT 5.0, -- percentage
  precision_bins INTEGER DEFAULT 69,
  
  -- MCU (Market Cap Up-only)
  mcu_enabled BOOLEAN DEFAULT false,
  mcu_threshold NUMERIC(10, 2),
  
  -- Risk Management
  auto_rebalance BOOLEAN DEFAULT true,
  auto_compound BOOLEAN DEFAULT true,
  take_profit NUMERIC(10, 2), -- percentage
  stop_loss NUMERIC(10, 2), -- percentage
  
  -- ML Ensemble Config
  ml_enabled BOOLEAN DEFAULT true,
  ml_confidence_threshold NUMERIC(5, 2) DEFAULT 90.0,
  
  active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add strategy_id foreign key to positions
ALTER TABLE positions ADD CONSTRAINT fk_strategy 
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE SET NULL;

-- ML Signals table (LSTM + XGBoost predictions)
CREATE TABLE ml_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'rebalance', 'compound', 'exit', 'enter'
  confidence NUMERIC(5, 2) NOT NULL, -- 0-100
  
  -- Model predictions
  lstm_prediction JSONB,
  xgboost_prediction JSONB,
  ensemble_result JSONB,
  
  -- Price predictions
  predicted_price NUMERIC(20, 10),
  predicted_volatility NUMERIC(10, 6),
  
  -- Recommendation
  action TEXT, -- 'buy', 'sell', 'hold', 'rebalance'
  urgency TEXT, -- 'low', 'medium', 'high', 'critical'
  
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rebalance History table
CREATE TABLE rebalance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id),
  
  -- Before state
  old_lower_price NUMERIC(20, 10),
  old_upper_price NUMERIC(20, 10),
  old_liquidity NUMERIC(30, 10),
  
  -- After state
  new_lower_price NUMERIC(20, 10),
  new_upper_price NUMERIC(20, 10),
  new_liquidity NUMERIC(30, 10),
  
  -- Transaction details
  tx_signature TEXT,
  gas_cost NUMERIC(20, 10),
  
  -- Trigger reason
  trigger_type TEXT, -- 'auto', 'manual', 'ml_signal', 'stop_loss', 'take_profit'
  trigger_data JSONB,
  
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price History table (for ML training)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
  price NUMERIC(20, 10) NOT NULL,
  volume NUMERIC(20, 6),
  liquidity NUMERIC(30, 10),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- OHLCV data
  open NUMERIC(20, 10),
  high NUMERIC(20, 10),
  low NUMERIC(20, 10),
  close NUMERIC(20, 10)
);

-- Precision Curve Bins table (69-bin distribution)
CREATE TABLE precision_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  bin_index INTEGER NOT NULL,
  lower_price NUMERIC(20, 10) NOT NULL,
  upper_price NUMERIC(20, 10) NOT NULL,
  liquidity_allocation NUMERIC(10, 6) NOT NULL, -- percentage
  current_liquidity NUMERIC(30, 10) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(strategy_id, bin_index)
);

-- Keeper Jobs table
CREATE TABLE keeper_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL, -- 'rebalance', 'compound', 'monitor', 'ml_predict'
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id),
  
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Indexes for performance
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_pools_address ON pools(pool_address);
CREATE INDEX idx_pools_active ON pools(active) WHERE active = true;
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_pool ON positions(pool_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_strategies_user ON strategies(user_id);
CREATE INDEX idx_strategies_active ON strategies(active) WHERE active = true;
CREATE INDEX idx_ml_signals_pool ON ml_signals(pool_id);
CREATE INDEX idx_ml_signals_confidence ON ml_signals(confidence) WHERE confidence >= 90.0;
CREATE INDEX idx_ml_signals_executed ON ml_signals(executed) WHERE executed = false;
CREATE INDEX idx_rebalance_history_position ON rebalance_history(position_id);
CREATE INDEX idx_price_history_pool_time ON price_history(pool_id, timestamp DESC);
CREATE INDEX idx_precision_bins_strategy ON precision_bins(strategy_id);
CREATE INDEX idx_keeper_jobs_status ON keeper_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_keeper_jobs_scheduled ON keeper_jobs(scheduled_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own positions" ON positions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own positions" ON positions
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own strategies" ON strategies
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own strategies" ON strategies
  FOR ALL USING (auth.uid()::text = user_id::text);
