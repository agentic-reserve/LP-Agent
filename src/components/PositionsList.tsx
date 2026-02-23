import { useState, useEffect } from 'react';

interface Position {
  id: string;
  position_address: string;
  lower_price: number;
  upper_price: number;
  liquidity: number;
  status: string;
  pool: {
    token_a: string;
    token_b: string;
    dex: string;
  };
}

export default function PositionsList({ walletAddress }: { walletAddress: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPositions();
  }, [walletAddress]);

  const fetchPositions = async () => {
    try {
      const response = await fetch(`/api/positions/user/${walletAddress}`);
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading positions...</div>;
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 bg-hawk-dark/30 rounded-lg border border-gray-800">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">No positions yet</h3>
        <p className="text-gray-400">Create a strategy to start managing LP positions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => (
        <div
          key={position.id}
          className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6 hover:border-hawk-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {position.pool.token_a} / {position.pool.token_b}
              </h3>
              <p className="text-sm text-gray-400">{position.pool.dex}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                position.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {position.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Lower Price</p>
              <p className="font-mono">{position.lower_price.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-400">Upper Price</p>
              <p className="font-mono">{position.upper_price.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-400">Liquidity</p>
              <p className="font-mono">{position.liquidity.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            <button className="px-4 py-2 bg-hawk-primary/20 text-hawk-primary rounded hover:bg-hawk-primary/30 transition-colors text-sm">
              Rebalance
            </button>
            <button className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded hover:bg-gray-700 transition-colors text-sm">
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
