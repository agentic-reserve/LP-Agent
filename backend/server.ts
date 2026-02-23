import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createHelius } from 'helius-sdk';
import type { Database } from './types/database.js';
import { mlRouter } from './routes/ml.js';
import { positionsRouter } from './routes/positions.js';
import { strategiesRouter } from './routes/strategies.js';
import { poolsRouter } from './routes/pools.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Helius SDK
export const helius = createHelius({
  apiKey: process.env.HELIUS_API_KEY!,
});

// Initialize Supabase
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      helius: !!process.env.HELIUS_API_KEY,
      supabase: !!process.env.SUPABASE_URL,
      magicblock: !!process.env.MAGICBLOCK_RPC,
    }
  });
});

// Routes
app.use('/api/ml', mlRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/pools', poolsRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 HawkFi API running on port ${PORT}`);
  console.log(`📊 Helius RPC: ${process.env.HELIUS_API_KEY ? 'Connected' : 'Not configured'}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`⚡ MagicBlock: ${process.env.MAGICBLOCK_RPC || 'Not configured'}`);
});
