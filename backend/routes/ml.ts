import { Router } from 'express';
import { mlEnsemble } from '../services/ml-ensemble.js';
import { supabase } from '../server.js';

export const mlRouter = Router();

// Generate ML signal for a pool
mlRouter.post('/signal/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Fetch pool data
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Fetch price history
    const { data: priceHistory, error: historyError } = await supabase
      .from('price_history')
      .select('price, timestamp')
      .eq('pool_id', poolId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (historyError) throw historyError;

    // Generate ML prediction
    const prediction = await mlEnsemble.generateSignal({
      poolId,
      currentPrice: priceHistory?.[0]?.price || 0,
      volume24h: pool.volume_24h || 0,
      liquidity: pool.tvl || 0,
      priceHistory: priceHistory || [],
    });

    // Save signal to database
    const signal = await mlEnsemble.saveSignal(poolId, prediction);

    res.json({
      success: true,
      signal,
      prediction,
    });
  } catch (error: any) {
    next(error);
  }
});

// Get active signals for a pool
mlRouter.get('/signals/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const minConfidence = parseFloat(req.query.minConfidence as string) || 90;

    const signals = await mlEnsemble.getActiveSignals(poolId, minConfidence);

    res.json({
      success: true,
      signals,
      count: signals.length,
    });
  } catch (error) {
    next(error);
  }
});

// Mark signal as executed
mlRouter.post('/signals/:signalId/execute', async (req, res, next) => {
  try {
    const { signalId } = req.params;

    const { data, error } = await supabase
      .from('ml_signals')
      .update({
        executed: true,
        executed_at: new Date().toISOString(),
      })
      .eq('id', signalId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      signal: data,
    });
  } catch (error) {
    next(error);
  }
});

// Get ML performance metrics
mlRouter.get('/metrics', async (req, res, next) => {
  try {
    const { data: signals, error } = await supabase
      .from('ml_signals')
      .select('confidence, action, executed, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const metrics = {
      totalSignals: signals.length,
      executedSignals: signals.filter(s => s.executed).length,
      avgConfidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length,
      actionBreakdown: {
        buy: signals.filter(s => s.action === 'buy').length,
        sell: signals.filter(s => s.action === 'sell').length,
        hold: signals.filter(s => s.action === 'hold').length,
        rebalance: signals.filter(s => s.action === 'rebalance').length,
      },
    };

    res.json({
      success: true,
      metrics,
      period: '7d',
    });
  } catch (error) {
    next(error);
  }
});
