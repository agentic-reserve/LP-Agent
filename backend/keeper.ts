// HawkFi Keeper - Automated rebalancing and monitoring
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Helius } from 'helius-sdk';
import { mlEnsemble } from './services/ml-ensemble.js';
import { precisionCurve } from './services/precision-curve.js';
import type { Database } from './types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const helius = new Helius(process.env.HELIUS_API_KEY!);

async function runKeeper() {
  console.log('🦅 HawkFi Keeper starting...', new Date().toISOString());

  try {
    // 1. Monitor active positions
    await monitorPositions();

    // 2. Generate ML signals
    await generateMLSignals();

    // 3. Execute pending keeper jobs
    await executePendingJobs();

    console.log('✅ Keeper cycle completed');
  } catch (error) {
    console.error('❌ Keeper error:', error);
    process.exit(1);
  }
}

async function monitorPositions() {
  const { data: positions } = await supabase
    .from('positions')
    .select(`
      *,
      pool:pools(*),
      strategy:strategies(*)
    `)
    .eq('status', 'active');

  if (!positions) return;

  for (const position of positions) {
    if (!position.strategy?.auto_rebalance) continue;

    // Get latest price
    const { data: latestPrice } = await supabase
      .from('price_history')
      .select('price')
      .eq('pool_id', position.pool_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!latestPrice) continue;

    // Check if rebalance needed
    const { data: bins } = await supabase
      .from('precision_bins')
      .select('*')
      .eq('strategy_id', position.strategy_id)
      .eq('active', true);

    const needsRebalance = precisionCurve.shouldRebalance(
      latestPrice.price,
      bins || [],
      position.strategy.rebalance_threshold
    );

    if (needsRebalance) {
      console.log(`📊 Position ${position.id} needs rebalance`);
      
      // Create keeper job
      await supabase.from('keeper_jobs').insert({
        job_type: 'rebalance',
        position_id: position.id,
        strategy_id: position.strategy_id,
        status: 'pending',
        priority: 7,
      });
    }

    // Check stop loss / take profit
    if (position.strategy.stop_loss || position.strategy.take_profit) {
      const entryPrice = position.lower_price;
      const priceChange = ((latestPrice.price - entryPrice) / entryPrice) * 100;

      if (position.strategy.stop_loss && priceChange <= -position.strategy.stop_loss) {
        console.log(`🛑 Stop loss triggered for position ${position.id}`);
        await supabase.from('keeper_jobs').insert({
          job_type: 'rebalance',
          position_id: position.id,
          strategy_id: position.strategy_id,
          status: 'pending',
          priority: 10,
        });
      }

      if (position.strategy.take_profit && priceChange >= position.strategy.take_profit) {
        console.log(`💰 Take profit triggered for position ${position.id}`);
        await supabase.from('keeper_jobs').insert({
          job_type: 'rebalance',
          position_id: position.id,
          strategy_id: position.strategy_id,
          status: 'pending',
          priority: 8,
        });
      }
    }
  }
}

async function generateMLSignals() {
  const { data: pools } = await supabase
    .from('pools')
    .select('*')
    .eq('active', true);

  if (!pools) return;

  for (const pool of pools) {
    try {
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('price, timestamp')
        .eq('pool_id', pool.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!priceHistory || priceHistory.length < 20) continue;

      const prediction = await mlEnsemble.generateSignal({
        poolId: pool.id,
        currentPrice: priceHistory[0].price,
        volume24h: pool.volume_24h || 0,
        liquidity: pool.tvl || 0,
        priceHistory,
      });

      await mlEnsemble.saveSignal(pool.id, prediction);
      console.log(`🤖 ML signal generated for pool ${pool.id}: ${prediction.action} (${prediction.confidence}%)`);
    } catch (error: any) {
      console.warn(`⚠️  ML signal failed for pool ${pool.id}:`, error.message);
    }
  }
}

async function executePendingJobs() {
  const { data: jobs } = await supabase
    .from('keeper_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(10);

  if (!jobs) return;

  for (const job of jobs) {
    console.log(`⚙️  Executing job ${job.id}: ${job.job_type}`);
    
    await supabase
      .from('keeper_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    try {
      // Simulate job execution (replace with actual logic)
      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabase
        .from('keeper_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { success: true },
        })
        .eq('id', job.id);

      console.log(`✅ Job ${job.id} completed`);
    } catch (error: any) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      
      await supabase
        .from('keeper_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          retry_count: job.retry_count + 1,
        })
        .eq('id', job.id);
    }
  }
}

// Run keeper
runKeeper();
