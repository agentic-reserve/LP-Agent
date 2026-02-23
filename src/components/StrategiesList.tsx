import { useState, useEffect } from 'react';

interface Strategy {
  id: string;
  name: string;
  strategy_type: string;
  precision_bins: number;
  mcu_enabled: boolean;
  auto_rebalance: boolean;
  ml_enabled: boolean;
  active: boolean;
}

export default function StrategiesList({ walletAddress }: { walletAddress: string }) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, [walletAddress]);

  const fetchStrategies = async () => {
    try {
      const response = await fetch(`/api/strategies/user/${walletAddress}`);
      const data = await response.json();
      setStrategies(data.strategies || []);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading strategies...</div>;
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <div
          key={strategy.id}
          className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{strategy.name}</h3>
              <p className="text-sm text-gray-400">{strategy.strategy_type}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                strategy.active
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {strategy.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Precision Bins</p>
              <p className="font-semibold">{strategy.precision_bins}</p>
            </div>
            <div>
              <p className="text-gray-400">MCU</p>
              <p className="font-semibold">{strategy.mcu_enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <p className="text-gray-400">Auto Rebalance</p>
              <p className="font-semibold">{strategy.auto_rebalance ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-gray-400">ML Signals</p>
              <p className="font-semibold">{strategy.ml_enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
