import { Router } from 'express';
import { supabase } from '../server.js';
import { precisionCurve } from '../services/precision-curve.js';

export const positionsRouter = Router();

// Get all positions for a user
positionsRouter.get('/user/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get positions with pool data
    const { data: positions, error } = await supabase
      .from('positions')
      .select(`
        *,
        pool:pools(*),
        strategy:strategies(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      positions,
      count: positions.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get single position details
positionsRouter.get('/:positionId', async (req, res, next) => {
  try {
    const { positionId } = req.params;

    const { data: position, error } = await supabase
      .from('positions')
      .select(`
        *,
        pool:pools(*),
        strategy:strategies(*),
        rebalance_history(*)
      `)
      .eq('id', positionId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      position,
    });
  } catch (error) {
    next(error);
  }
});

// Create new position
positionsRouter.post('/', async (req, res, next) => {
  try {
    const {
      walletAddress,
      poolId,
      positionAddress,
      lowerPrice,
      upperPrice,
      liquidity,
      strategyId,
    } = req.body;

    // Get or create user
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

    // Create position
    const { data: position, error } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        pool_id: poolId,
        position_address: positionAddress,
        lower_price: lowerPrice,
        upper_price: upperPrice,
        liquidity,
        strategy_id: strategyId,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      position,
    });
  } catch (error) {
    next(error);
  }
});

// Check if position needs rebalancing
positionsRouter.get('/:positionId/check-rebalance', async (req, res, next) => {
  try {
    const { positionId } = req.params;

    const { data: position, error } = await supabase
      .from('positions')
      .select(`
        *,
        pool:pools(*),
        strategy:strategies(*)
      `)
      .eq('id', positionId)
      .single();

    if (error) throw error;

    // Get current price
    const { data: latestPrice } = await supabase
      .from('price_history')
      .select('price')
      .eq('pool_id', position.pool_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!latestPrice) {
      return res.json({
        success: true,
        needsRebalance: false,
        reason: 'No price data available',
      });
    }

    // Get precision bins for strategy
    const { data: bins } = await supabase
      .from('precision_bins')
      .select('*')
      .eq('strategy_id', position.strategy_id)
      .eq('active', true);

    const needsRebalance = precisionCurve.shouldRebalance(
      latestPrice.price,
      bins || [],
      position.strategy?.rebalance_threshold || 5.0
    );

    // Calculate IL
    const il = precisionCurve.calculateImpermanentLoss(
      position.lower_price,
      latestPrice.price,
      position.lower_price,
      position.upper_price
    );

    res.json({
      success: true,
      needsRebalance,
      currentPrice: latestPrice.price,
      impermanentLoss: il,
      activeBins: bins?.length || 0,
      recommendation: needsRebalance ? 'Rebalance recommended' : 'Position optimal',
    });
  } catch (error) {
    next(error);
  }
});

// Update position status
positionsRouter.patch('/:positionId', async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const updates = req.body;

    const { data: position, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', positionId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      position,
    });
  } catch (error) {
    next(error);
  }
});
