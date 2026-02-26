import { PriceService } from './price-service.js';

const HAWKFI_API = 'https://api2.hawksight.co';

interface HawkFiPool {
  id: string;
  name: string;
  url: string;
  protocol: string;
  config: {
    address: string;
    mint_a: string;
    mint_b: string;
    vault_a: string;
    vault_b: string;
  };
  liquidity: number;
  volume24h: number;
  volume7d: number;
  apr24h: number;
  apr7d: number;
  fee24h: number;
}

const poolCache: { pools: HawkFiPool[]; timestamp: number } = { pools: [], timestamp: 0 };
const CACHE_TTL = 60 * 1000;

const TOKEN_MINT_MAP: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoxtixZGmtDqLAQDDRN4nbCK': 'BONK',
  'A1bK9gzKqC9C8Ks6xV6y18XJ7wK3v5YmN3xLk4h6m3aD': 'WIF',
  '85VBFQZC9TZkfaptBWqv14ALD9fJNUKtWA41kh69teRP': 'POPCAT',
  '63tLLZ9r5r4qLRdLBvWyoo1g1kMJX5q4M4m8h4j6f5k': 'boden',
  '6abrYCnN4ZQr3YNKw7vJs3w3r2k5X7xZ8y9L1qP2m3nB': 'WEN',
  'DUKvM5FNCyM3s5X7cZ5v8y9L1qP2m3nB4Zf6g8h9j0kL': 'SOL',
};

export class HawkFiService {
  static async getPools(limit = 50, protocol?: string): Promise<any[]> {
    const now = Date.now();
    if (poolCache.pools.length > 0 && now - poolCache.timestamp < CACHE_TTL) {
      return poolCache.pools.slice(0, limit);
    }

    try {
      let url = `${HAWKFI_API}/pools?limit=100`;
      if (protocol) {
        url += `&protocol=${protocol}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HawkFi API error: ${response.status}`);
      }

      const data = await response.json();
      poolCache.pools = data.pools || [];
      poolCache.timestamp = now;

      return poolCache.pools.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch pools from HawkFi:', error);
      return poolCache.pools.slice(0, limit);
    }
  }

  static async getPoolsByProtocol(protocol: string): Promise<HawkFiPool[]> {
    return this.getPools(100, protocol);
  }

  static async getMeteoraPools(): Promise<HawkFiPool[]> {
    return this.getPoolsByProtocol('meteora');
  }

  static async getOrcaPools(): Promise<HawkFiPool[]> {
    return this.getPoolsByProtocol('orca');
  }

  static async getRaydiumPools(): Promise<HawkFiPool[]> {
    return this.getPoolsByProtocol('raydium');
  }

  static getTokenSymbol(mint: string): string {
    return TOKEN_MINT_MAP[mint] || mint.slice(0, 8);
  }

  static async getPoolWithPrice(pool: HawkFiPool) {
    const tokenA = this.getTokenSymbol(pool.config.mint_a);
    const tokenB = this.getTokenSymbol(pool.config.mint_b);
    const price = await PriceService.getPricesForPool(tokenA, tokenB);

    return {
      ...pool,
      token_a: tokenA,
      token_b: tokenB,
      currentPrice: price,
      priceSource: price ? 'binance' : null,
    };
  }

  static async getAllPoolsWithPrices(limit = 50): Promise<any[]> {
    const pools = await this.getPools(limit);
    const poolsWithPrices = await Promise.all(
      pools.map(async (pool) => this.getPoolWithPrice(pool))
    );
    return poolsWithPrices;
  }
}
