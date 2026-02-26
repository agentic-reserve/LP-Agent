import { Router } from 'express';
import { supabase, helius } from '../server.js';
import { PriceService } from '../services/price-service.js';
import { HawkFiService } from '../services/hawkfi-service.js';

export const poolsRouter = Router();

// Get all pools with real-time data from HawkFi
poolsRouter.get('/', async (req, res, next) => {
  try {
    const { limit } = req.query;
    const poolLimit = parseInt(limit as string) || 10;

    const HAWKFI_API = 'https://api2.hawksight.co';
    const response = await fetch(`${HAWKFI_API}/pools?limit=${poolLimit}`);
    const data = await response.json();
    
    const pools = (data.pools || []).map((pool: any) => ({
      id: pool.id,
      name: pool.name,
      protocol: pool.protocol,
      tokenA: pool.config.mint_a,
      tokenB: pool.config.mint_b,
      tvl: pool.metrics?.tvl || 0,
      volume24h: pool.metrics?.volume_24h || 0,
      apr24h: pool.metrics?.apr_display || 0,
      url: pool.url,
    }));

    res.json({
      success: true,
      pools,
      count: pools.length,
      source: 'hawkfi',
    });
  } catch (error) {
    next(error);
  }
});

// Get pools by protocol
poolsRouter.get('/meteora', async (req, res, next) => {
  try {
    const pools = await HawkFiService.getMeteoraPools();
    const poolsWithPrices = await Promise.all(
      pools.map(async (pool) => HawkFiService.getPoolWithPrice(pool))
    );
    res.json({ success: true, pools: poolsWithPrices, count: poolsWithPrices.length });
  } catch (error) {
    next(error);
  }
});

poolsRouter.get('/orca', async (req, res, next) => {
  try {
    const pools = await HawkFiService.getOrcaPools();
    const poolsWithPrices = await Promise.all(
      pools.map(async (pool) => HawkFiService.getPoolWithPrice(pool))
    );
    res.json({ success: true, pools: poolsWithPrices, count: poolsWithPrices.length });
  } catch (error) {
    next(error);
  }
});

poolsRouter.get('/raydium', async (req, res, next) => {
  try {
    const pools = await HawkFiService.getRaydiumPools();
    const poolsWithPrices = await Promise.all(
      pools.map(async (pool) => HawkFiService.getPoolWithPrice(pool))
    );
    res.json({ success: true, pools: poolsWithPrices, count: poolsWithPrices.length });
  } catch (error) {
    next(error);
  }
});

// Get pool by ID from database with real-time price
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

    const currentPrice = await PriceService.getPricesForPool(pool.token_a, pool.token_b);

    res.json({
      success: true,
      pool: {
        ...pool,
        currentPrice,
        priceSource: currentPrice ? 'binance' : 'cache',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time price for a token pair
poolsRouter.get('/price/:tokenA/:tokenB', async (req, res, next) => {
  try {
    const { tokenA, tokenB } = req.params;
    const price = await PriceService.getPricesForPool(tokenA, tokenB);

    if (!price) {
      return res.status(404).json({ error: 'Price not available' });
    }

    res.json({
      success: true,
      symbol: PriceService.getTokenPairSymbol(tokenA, tokenB),
      price,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// Sync price history from Binance
poolsRouter.post('/:poolId/sync-prices', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const { data: pool, error } = await supabase
      .from('pools')
      .select('token_a, token_b')
      .eq('id', poolId)
      .single();

    if (error || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    await PriceService.savePriceHistory(poolId, pool.token_a, pool.token_b);

    res.json({
      success: true,
      message: 'Price history synced from Binance',
    });
  } catch (error) {
    next(error);
  }
});
