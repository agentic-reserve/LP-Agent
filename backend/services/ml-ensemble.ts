import OpenRouter from '@openrouter/sdk';
import { supabase } from '../server.js';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

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
      // Try minimax first (primary model)
      const result = await this.callModel(this.minimaxModel, prompt);
      return result;
    } catch (error) {
      console.warn('Minimax failed, falling back to DeepSeek:', error);
      // Fallback to DeepSeek
      const result = await this.callModel(this.deepseekModel, prompt);
      return result;
    }
  }

  private async callModel(model: string, prompt: string): Promise<MLPrediction> {
    const result = openrouter.callModel({
      model,
      temperature: 0.3,
      maxOutputTokens: 1000,
      input: [
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
      ]
    });

    const text = await result.getText();
    
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
  }

  private buildAnalysisPrompt(poolData: PoolData): string {
    const recentPrices = poolData.priceHistory.slice(-20);
    const priceChange24h = ((poolData.currentPrice - recentPrices[0].price) / recentPrices[0].price) * 100;
    
    return `Analyze this Solana LP pool for HFL rebalancing decision:

Pool ID: ${poolData.poolId}
Current Price: ${poolData.currentPrice}
24h Volume: ${poolData.volume24h}
Total Liquidity: ${poolData.liquidity}
24h Price Change: ${priceChange24h.toFixed(2)}%

Recent Price History (last 20 data points):
${recentPrices.map(p => `${p.timestamp}: ${p.price}`).join('\n')}

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
