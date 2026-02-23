import { Router } from 'express';
import { supabase } from '../server.js';
import { precisionCurve } from '../services/precision-curve.js';

export const strategiesRouter = Router();

// Get all strategies for a user
strategiesRouter.get('/user/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: strategies, error } = await supabase
      .from('strategies')
      .select(`
        *,
        pool:pools(*),
        positions:positions(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      strategies,
      count: strategies.length,
    });
  } catch (error) {
    next(error);
  }
});

// Create new strategy with precision bins
strategiesRouter.post('/', async (req, res, next) => {
  try {
    const {
      walletAddress,
      name,
      poolId,
      strategyType,
      rebalanceThreshold = 5.0,
      precisionBins = 69,
      mcuEnabled = false,
      mcuThreshold,
      autoRebalance = true,
      autoCompound = true,
      takeProfit,
      stopLoss,
      mlEnabled = true,
      mlConfidenceThreshold = 90.0,
      currentPrice,
    } = req.body;

    // Get user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ wallet_address: walletAddress })
        .select()
        .single();

      if (userError) throw userError;
      user = newUser;
    }

    // Create strategy
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        name,
        pool_id: poolId,
        strategy_type: strategyType,
        rebalance_threshold: rebalanceThreshold,
        precision_bins: precisionBins,
        mcu_enabled: mcuEnabled,
        mcu_threshold: mcuThreshold,
        auto_rebalance: autoRebalance,
        auto_compound: autoCompound,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        ml_enabled: mlEnabled,
        ml_confidence_threshold: mlConfidenceThreshold,
        active: true,
      })
      .select()
      .single();

    if (strategyError) throw strategyError;

    // Generate precision curve bins
    let bins = precisionCurve.generateBins(currentPrice || 1.0);

    // Apply MCU bias if enabled
    if (mcuEnabled) {
      bins = precisionCurve.applyMCUBias(bins, 1.3);
    }

    // Save bins to database
    const binInserts = bins.map(bin => ({
      strategy_id: strategy.id,
      bin_index: bin.binIndex,
      lower_price: bin.lowerPrice,
      upper_price: bin.upperPrice,
      liquidity_allocation: bin.liquidityAllocation,
      active: true,
    }));

    const { error: binsError } = await supabase
      .from('precision_bins')
      .insert(binInserts);

    if (binsError) throw binsError;

    res.json({
      success: true,
      strategy,
      bins: bins.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get strategy with bins
strategiesRouter.get('/:strategyId', async (req, res, next) => {
  try {
    const { strategyId } = req.params;

    const { data: strategy, error } = await supabase
      .from('strategies')
      .select(`
        *,
        pool:pools(*),
        precision_bins(*),
        positions(*)
      `)
      .eq('id', strategyId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      strategy,
    });
  } catch (error) {
    next(error);
  }
});

// Update strategy
strategiesRouter.patch('/:strategyId', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const updates = req.body;

    const { data: strategy, error } = await supabase
      .from('strategies')
      .update(updates)
      .eq('id', strategyId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      strategy,
    });
  } catch (error) {
    next(error);
  }
});

// Regenerate precision bins for strategy
strategiesRouter.post('/:strategyId/regenerate-bins', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const { currentPrice, volatility } = req.body;

    // Get strategy
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (strategyError) throw strategyError;

    // Deactivate old bins
    await supabase
      .from('precision_bins')
      .update({ active: false })
      .eq('strategy_id', strategyId);

    // Generate new bins
    let bins = precisionCurve.generateBins(currentPrice);

    // Adjust for volatility if provided
    if (volatility) {
      bins = precisionCurve.adjustForVolatility(bins, volatility);
    }

    // Apply MCU bias if enabled
    if (strategy.mcu_enabled) {
      bins = precisionCurve.applyMCUBias(bins);
    }

    // Insert new bins
    const binInserts = bins.map(bin => ({
      strategy_id: strategyId,
      bin_index: bin.binIndex,
      lower_price: bin.lowerPrice,
      upper_price: bin.upperPrice,
      liquidity_allocation: bin.liquidityAllocation,
      active: true,
    }));

    const { error: binsError } = await supabase
      .from('precision_bins')
      .insert(binInserts);

    if (binsError) throw binsError;

    res.json({
      success: true,
      bins: bins.length,
      message: 'Precision bins regenerated',
    });
  } catch (error) {
    next(error);
  }
});
