// HawkFi Precision Curve - 69-bin liquidity distribution
// Optimizes capital efficiency with concentrated liquidity

export interface PrecisionBin {
  binIndex: number;
  lowerPrice: number;
  upperPrice: number;
  liquidityAllocation: number; // percentage
}

export class PrecisionCurve {
  private readonly TOTAL_BINS = 69;
  private readonly CONCENTRATION_FACTOR = 2.5; // Higher = more concentrated around current price

  /**
   * Generate 69-bin precision curve around current price
   * Uses Gaussian-like distribution for optimal capital efficiency
   */
  generateBins(currentPrice: number, rangeMultiplier = 2.0): PrecisionBin[] {
    const bins: PrecisionBin[] = [];
    const centerBin = Math.floor(this.TOTAL_BINS / 2);
    
    // Calculate price range
    const minPrice = currentPrice / rangeMultiplier;
    const maxPrice = currentPrice * rangeMultiplier;
    const priceStep = (maxPrice - minPrice) / this.TOTAL_BINS;

    // Generate bins with Gaussian distribution
    let totalWeight = 0;
    const weights: number[] = [];

    for (let i = 0; i < this.TOTAL_BINS; i++) {
      const distanceFromCenter = Math.abs(i - centerBin);
      const weight = Math.exp(-Math.pow(distanceFromCenter / (this.TOTAL_BINS / 4), 2) * this.CONCENTRATION_FACTOR);
      weights.push(weight);
      totalWeight += weight;
    }

    // Normalize weights to percentages
    for (let i = 0; i < this.TOTAL_BINS; i++) {
      const lowerPrice = minPrice + (i * priceStep);
      const upperPrice = minPrice + ((i + 1) * priceStep);
      const liquidityAllocation = (weights[i] / totalWeight) * 100;

      bins.push({
        binIndex: i,
        lowerPrice,
        upperPrice,
        liquidityAllocation,
      });
    }

    return bins;
  }

  /**
   * Calculate optimal rebalance based on price movement
   * Returns true if rebalance needed
   */
  shouldRebalance(
    currentPrice: number,
    activeBins: PrecisionBin[],
    threshold = 5.0 // percentage
  ): boolean {
    if (activeBins.length === 0) return true;

    // Find bins containing current price
    const activeBinsInRange = activeBins.filter(
      bin => currentPrice >= bin.lowerPrice && currentPrice <= bin.upperPrice
    );

    if (activeBinsInRange.length === 0) {
      // Price moved outside all active bins - urgent rebalance
      return true;
    }

    // Calculate total liquidity in active range
    const totalLiquidity = activeBins.reduce((sum, bin) => sum + bin.liquidityAllocation, 0);
    const activeLiquidity = activeBinsInRange.reduce((sum, bin) => sum + bin.liquidityAllocation, 0);
    
    const activePercentage = (activeLiquidity / totalLiquidity) * 100;

    // Rebalance if less than threshold% of liquidity is active
    return activePercentage < threshold;
  }

  /**
   * MCU (Market Cap Up-only) adjustment
   * Biases bins toward higher prices for bullish assets
   */
  applyMCUBias(bins: PrecisionBin[], mcuFactor = 1.3): PrecisionBin[] {
    const centerBin = Math.floor(this.TOTAL_BINS / 2);
    
    return bins.map((bin, index) => {
      if (index > centerBin) {
        // Increase allocation for upper bins
        const distanceFromCenter = index - centerBin;
        const boost = 1 + (distanceFromCenter / this.TOTAL_BINS) * (mcuFactor - 1);
        return {
          ...bin,
          liquidityAllocation: bin.liquidityAllocation * boost,
        };
      }
      return bin;
    }).map(bin => {
      // Re-normalize to 100%
      const total = bins.reduce((sum, b) => sum + b.liquidityAllocation, 0);
      return {
        ...bin,
        liquidityAllocation: (bin.liquidityAllocation / total) * 100,
      };
    });
  }

  /**
   * Calculate impermanent loss for current position
   */
  calculateImpermanentLoss(
    entryPrice: number,
    currentPrice: number,
    lowerPrice: number,
    upperPrice: number
  ): number {
    const priceRatio = currentPrice / entryPrice;
    
    // Simplified IL calculation for concentrated liquidity
    if (currentPrice < lowerPrice || currentPrice > upperPrice) {
      // Out of range - 100% IL (single asset)
      return 100;
    }

    // In range IL formula
    const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
    return Math.abs(il) * 100;
  }

  /**
   * Optimize bin distribution based on volatility
   * Higher volatility = wider range, lower concentration
   */
  adjustForVolatility(bins: PrecisionBin[], volatility: number): PrecisionBin[] {
    // volatility: 0-100 scale
    const spreadFactor = 1 + (volatility / 100);
    const currentPrice = bins[Math.floor(bins.length / 2)].lowerPrice;

    return this.generateBins(currentPrice, spreadFactor * 2.0);
  }
}

export const precisionCurve = new PrecisionCurve();
