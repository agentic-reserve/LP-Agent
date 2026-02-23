import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '../server.js';

export const percolatorRouter = Router();

const PERCOLATOR_SLAB = process.env.PERCOLATOR_SLAB || 'A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs';
const connection = new Connection(
  process.env.VITE_SOLANA_RPC_HTTP || 'https://api.devnet.solana.com',
  'confirmed'
);

// Get perp positions for a user
percolatorRouter.get('/positions/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return res.json({ success: true, positions: [] });
    }

    // Get perp positions
    const { data: positions, error } = await supabase
      .from('perp_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      positions: positions || [],
      count: positions?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

// Get global coverage ratio from Percolator
percolatorRouter.get('/coverage-ratio', async (req, res, next) => {
  try {
    const slabPubkey = new PublicKey(PERCOLATOR_SLAB);
    const accountInfo = await connection.getAccountInfo(slabPubkey);

    if (!accountInfo) {
      return res.json({
        success: true,
        coverageRatio: 1.0,
        message: 'Slab not found, assuming fully backed',
      });
    }

    // Parse coverage ratio from slab data
    // This is a simplified version - actual parsing would be more complex
    const data = accountInfo.data;
    
    // For now, return mock data
    // In production, parse actual slab account data
    const coverageRatio = 1.0;

    res.json({
      success: true,
      coverageRatio,
      slabAddress: PERCOLATOR_SLAB,
    });
  } catch (error) {
    console.error('Failed to get coverage ratio:', error);
    res.json({
      success: true,
      coverageRatio: 1.0,
      message: 'Error fetching coverage ratio, assuming fully backed',
    });
  }
});

// Calculate hedge recommendation for LP position
percolatorRouter.post('/calculate-hedge', async (req, res, next) => {
  try {
    const { lpPositionId } = req.body;

    // Get LP position
    const { data: position, error } = await supabase
      .from('positions')
      .select(`
        *,
        pool:pools(*)
      `)
      .eq('id', lpPositionId)
      .single();

    if (error || !position) {
      return res.status(404).json({ error: 'LP position not found' });
    }

    // Calculate LP exposure
    const midPrice = (position.lower_price + position.upper_price) / 2;
    const exposure = position.liquidity * midPrice;

    // Delta-neutral hedge: short perp equal to LP value
    const hedgeSize = -exposure;

    // Get coverage ratio
    const coverageResponse = await fetch(`${req.protocol}://${req.get('host')}/api/percolator/coverage-ratio`);
    const coverageData = await coverageResponse.json();
    const coverageRatio = coverageData.coverageRatio || 1.0;

    // Adjust for coverage ratio
    const adjustedHedgeSize = hedgeSize * coverageRatio;

    res.json({
      success: true,
      recommendation: {
        lpPositionId,
        currentExposure: exposure,
        recommendedHedgeSize: adjustedHedgeSize,
        hedgeRatio: coverageRatio,
        reasoning: `Delta-neutral hedge to offset IL. Coverage ratio: ${(coverageRatio * 100).toFixed(2)}%`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create perp position (placeholder)
percolatorRouter.post('/positions', async (req, res, next) => {
  try {
    const {
      walletAddress,
      percolatorUserIdx,
      capital,
      positionSize,
      entryPrice,
      lpPositionId,
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

    // Create perp position
    const { data: perpPosition, error } = await supabase
      .from('perp_positions')
      .insert({
        user_id: user.id,
        percolator_user_idx: percolatorUserIdx,
        slab_address: PERCOLATOR_SLAB,
        capital,
        position_size: positionSize,
        entry_price: entryPrice,
        lp_position_id: lpPositionId,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      position: perpPosition,
    });
  } catch (error) {
    next(error);
  }
});

// Update perp position PnL
percolatorRouter.patch('/positions/:positionId', async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const { unrealizedPnl, coverageRatio, status } = req.body;

    const { data: position, error } = await supabase
      .from('perp_positions')
      .update({
        unrealized_pnl: unrealizedPnl,
        coverage_ratio: coverageRatio,
        status,
      })
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
