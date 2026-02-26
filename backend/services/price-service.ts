import { supabase } from '../server.js';

const BINANCE_API = 'https://api.binance.com/api/v3';

interface TokenPrice {
  symbol: string;
  price: number;
  timestamp: number;
}

const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 1000;

export class PriceService {
  private static getSymbol(tokenA: string, tokenB: string): string {
    return `${tokenA.toUpperCase()}${tokenB.toUpperCase()}`;
  }

  static async getPrice(symbol: string): Promise<number | null> {
    const cacheKey = symbol.toUpperCase();
    const cached = priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }

    try {
      const response = await fetch(`${BINANCE_API}/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        console.warn(`Binance API error: ${response.status}`);
        return cached?.price || null;
      }
      const data = await response.json();
      const price = parseFloat(data.price);

      priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error('Failed to fetch price from Binance:', error);
      return cached?.price || null;
    }
  }

  static async getPricesForPool(tokenA: string, tokenB: string): Promise<number | null> {
    const symbol = this.getSymbol(tokenA, tokenB);
    return this.getPrice(symbol);
  }

  static async getMultiplePrices(tokens: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    await Promise.all(
      tokens.map(async (token) => {
        const price = await this.getPrice(`${token.toUpperCase()}USDT`);
        if (price) prices.set(token.toUpperCase(), price);
      })
    );
    return prices;
  }

  static async getOHLC(symbol: string, interval: string = '1h', limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(
        `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((k: any) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
      }));
    } catch (error) {
      console.error('Failed to fetch OHLC from Binance:', error);
      return [];
    }
  }

  static async savePriceHistory(poolId: string, tokenA: string, tokenB: string): Promise<void> {
    const symbol = this.getSymbol(tokenA, tokenB);
    const price = await this.getPrice(symbol);
    if (!price) return;

    const ohlc = await this.getOHLC(symbol, '1h', 24);
    
    const inserts = ohlc.map((k) => ({
      pool_id: poolId,
      price: k.close,
      volume: k.volume,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      timestamp: new Date(k.closeTime).toISOString(),
    }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('price_history').insert(inserts);
      if (error) console.error('Failed to save price history:', error);
    }
  }

  static getTokenPairSymbol(tokenA: string, tokenB: string): string {
    return this.getSymbol(tokenA, tokenB);
  }
}
