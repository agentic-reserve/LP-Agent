// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          created_at: string;
          updated_at: string;
          settings: Record<string, any>;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          created_at?: string;
          updated_at?: string;
          settings?: Record<string, any>;
        };
        Update: {
          wallet_address?: string;
          settings?: Record<string, any>;
        };
      };
      pools: {
        Row: {
          id: string;
          pool_address: string;
          token_a: string;
          token_b: string;
          dex: string;
          pool_type: string;
          tvl: number | null;
          volume_24h: number | null;
          fee_tier: number | null;
          active: boolean;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pool_address: string;
          token_a: string;
          token_b: string;
          dex: string;
          pool_type: string;
          tvl?: number | null;
          volume_24h?: number | null;
          fee_tier?: number | null;
          active?: boolean;
          metadata?: Record<string, any>;
        };
        Update: Partial<Database['public']['Tables']['pools']['Insert']>;
      };
      positions: {
        Row: {
          id: string;
          user_id: string;
          pool_id: string;
          position_address: string;
          lower_price: number;
          upper_price: number;
          liquidity: number;
          token_a_amount: number | null;
          token_b_amount: number | null;
          unclaimed_fees_a: number;
          unclaimed_fees_b: number;
          status: string;
          strategy_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pool_id: string;
          position_address: string;
          lower_price: number;
          upper_price: number;
          liquidity: number;
          token_a_amount?: number | null;
          token_b_amount?: number | null;
          status?: string;
          strategy_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['positions']['Insert']>;
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          pool_id: string | null;
          strategy_type: string;
          rebalance_threshold: number;
          precision_bins: number;
          mcu_enabled: boolean;
          mcu_threshold: number | null;
          auto_rebalance: boolean;
          auto_compound: boolean;
          take_profit: number | null;
          stop_loss: number | null;
          ml_enabled: boolean;
          ml_confidence_threshold: number;
          active: boolean;
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          pool_id?: string | null;
          strategy_type: string;
          rebalance_threshold?: number;
          precision_bins?: number;
          mcu_enabled?: boolean;
          mcu_threshold?: number | null;
          auto_rebalance?: boolean;
          auto_compound?: boolean;
          take_profit?: number | null;
          stop_loss?: number | null;
          ml_enabled?: boolean;
          ml_confidence_threshold?: number;
          active?: boolean;
          config?: Record<string, any>;
        };
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>;
      };
      ml_signals: {
        Row: {
          id: string;
          pool_id: string;
          signal_type: string;
          confidence: number;
          lstm_prediction: Record<string, any> | null;
          xgboost_prediction: Record<string, any> | null;
          ensemble_result: Record<string, any> | null;
          predicted_price: number | null;
          predicted_volatility: number | null;
          action: string | null;
          urgency: string | null;
          executed: boolean;
          executed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          signal_type: string;
          confidence: number;
          lstm_prediction?: Record<string, any> | null;
          xgboost_prediction?: Record<string, any> | null;
          ensemble_result?: Record<string, any> | null;
          predicted_price?: number | null;
          predicted_volatility?: number | null;
          action?: string | null;
          urgency?: string | null;
          executed?: boolean;
        };
        Update: Partial<Database['public']['Tables']['ml_signals']['Insert']>;
      };
      rebalance_history: {
        Row: {
          id: string;
          position_id: string;
          strategy_id: string | null;
          old_lower_price: number | null;
          old_upper_price: number | null;
          old_liquidity: number | null;
          new_lower_price: number | null;
          new_upper_price: number | null;
          new_liquidity: number | null;
          tx_signature: string | null;
          gas_cost: number | null;
          trigger_type: string | null;
          trigger_data: Record<string, any> | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
      };
      price_history: {
        Row: {
          id: string;
          pool_id: string;
          price: number;
          volume: number | null;
          liquidity: number | null;
          timestamp: string;
          open: number | null;
          high: number | null;
          low: number | null;
          close: number | null;
        };
      };
      precision_bins: {
        Row: {
          id: string;
          strategy_id: string;
          bin_index: number;
          lower_price: number;
          upper_price: number;
          liquidity_allocation: number;
          current_liquidity: number;
          active: boolean;
          created_at: string;
        };
      };
      keeper_jobs: {
        Row: {
          id: string;
          job_type: string;
          position_id: string | null;
          strategy_id: string | null;
          status: string;
          priority: number;
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          result: Record<string, any> | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
        };
      };
    };
  };
}
