import { OpenRouter } from '@openrouter/sdk';
import { supabase } from '../server.js';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface MLPrediction {
  confidence: number;
  action: 'buy' | 'sell' | 'hold' | 'rebalance';
  predictedPrice: number;
  predictedVolatility: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

interface PoolData {
  poolId: string;
  currentPrice: number;
  volume24h: number;
  liquidity: number;
  priceHistory: Array<{ price: number; timestamp: string }>;
}

export class MLEnsemble {
  private minimaxModel = 'minimax/minimax-m2.5';
  private deepseekModel = 'deepseek/deepseek-chat-v3.1';

  async generateSignal(poolData: PoolData): Promise<MLPrediction> {
    const prompt = this.buildAnalysisPrompt(poolData);
    
    try {
      const result = await this.callModel(this.minimaxModel, prompt);
      return result;
    } catch (error) {
      console.warn('Minimax failed, falling back to DeepSeek:', error);
      const result = await this.callModel(this.deepseekModel, prompt);
      return result;
    }
  }

  private async callModel(model: string, prompt: string): Promise<MLPrediction> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://hawkfi.io',
        'X-Title': 'HawkFi HFL Platform',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert DeFi LP strategy analyst specializing in HawkFi HFL (High-Frequency Liquidity) management.
Your task is to analyze pool data and provide ML-grade predictions with >90% confidence.
You simulate LSTM (time-series patterns) and XGBoost (feature-based) ensemble predictions.

Output ONLY valid JSON with this exact structure:
{
  "confidence": 0-100,
  "action": "buy" | "sell" | "hold" | "rebalance",
  "predictedPrice": number,
  "predictedVolatility": number,
  "urgency": "low" | "medium" | "high" | "critical",
  "reasoning": "brief explanation"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid model response format');
    }

    const prediction = JSON.parse(jsonMatch[0]);
    
    // Validate confidence threshold
    if (prediction.confidence < 90) {
      throw new Error(`Confidence ${prediction.confidence}% below threshold (90%)`);
    }

    return prediction;
  } catch (error) {
    console.error('Model call failed:', error);
    throw error;
  }

  private buildAnalysisPrompt(poolData: PoolData): string {
    const recentPrices = poolData.priceHistory.slice(-20);
    const hasPriceHistory = recentPrices.length > 0 && recentPrices[0]?.price;
    const priceChange24h = hasPriceHistory 
      ? ((poolData.currentPrice - recentPrices[0].price) / recentPrices[0].price) * 100 
      : 0;
    
    return `Analyze this Solana LP pool for HFL rebalancing decision:

Pool ID: ${poolData.poolId}
Current Price (Binance): $${poolData.currentPrice}
24h Volume: ${poolData.volume24h}
Total Liquidity: ${poolData.liquidity}
24h Price Change: ${priceChange24h.toFixed(2)}%

Recent Price History (last 20 data points):
${hasPriceHistory ? recentPrices.map(p => `${p.timestamp}: $${p.price}`).join('\n') : 'No historical data available - using real-time price only'}

Consider:
1. LSTM pattern: Identify time-series trends, momentum, mean reversion
2. XGBoost features: Volume/liquidity ratio, volatility, price velocity
3. HFL strategy: Precision Curve 69-bin optimization, MCU up-only bias
4. Risk factors: Impermanent loss, gas costs, slippage

Provide prediction with >90% confidence or reject.`;
  }

  async saveSignal(poolId: string, prediction: MLPrediction) {
    const { data, error } = await supabase
      .from('ml_signals')
      .insert({
        pool_id: poolId,
        signal_type: prediction.action,
        confidence: prediction.confidence,
        lstm_prediction: { reasoning: prediction.reasoning },
        xgboost_prediction: { urgency: prediction.urgency },
        ensemble_result: prediction,
        predicted_price: prediction.predictedPrice,
        predicted_volatility: prediction.predictedVolatility,
        action: prediction.action,
        urgency: prediction.urgency,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveSignals(poolId: string, minConfidence = 90) {
    const { data, error } = await supabase
      .from('ml_signals')
      .select('*')
      .eq('pool_id', poolId)
      .eq('executed', false)
      .gte('confidence', minConfidence)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  }
}

export const mlEnsemble = new MLEnsemble();
