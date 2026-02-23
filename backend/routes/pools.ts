import { Router } from 'express';
import { supabase, helius } from '../server.js';

export const poolsRouter = Router();

// Get all active pools
poolsRouter.get('/', async (req, res, next) => {
  try {
    const { data: pools, error } = await supabase
      .from('pools')
      .select('*')
      .eq('active', true)
      .order('tvl', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      pools,
      count: pools.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get pool by ID with price history
poolsRouter.get('/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const { data: pool, error } = await supabase
      .from('pools')
      .select(`
        *,
        price_history(*)
      `)
      .eq('id', poolId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      pool,
    });
  } catch (error) {
    next(error);
  }
});
