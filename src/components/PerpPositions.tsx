import { useState, useEffect } from 'react';

interface PerpPosition {
  id: string;
  percolator_user_idx: number;
  capital: number;
  position_size: number;
  entry_price: number;
  unrealized_pnl: number;
  coverage_ratio: number;
  status: string;
  lp_position_id?: string;
}

export default function PerpPositions({ walletAddress }: { walletAddress: string }) {
  const [positions, setPositions] = useState<PerpPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverageRatio, setCoverageRatio] = useState(1.0);

  useEffect(() => {
    fetchPerpPositions();
    fetchCoverageRatio();
  }, [walletAddress]);

  const fetchPerpPositions = async () => {
    try {
      const response = await fetch(`/api/percolator/positions/${walletAddress}`);
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Failed to fetch perp positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoverageRatio = async () => {
    try {
      const response = await fetch('/api/percolator/coverage-ratio');
      const data = await response.json();
      setCoverageRatio(data.coverageRatio || 1.0);
    } catch (error) {
      console.error('Failed to fetch coverage ratio:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading perp positions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Coverage Ratio Alert */}
      {coverageRatio < 1.0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-400">Low Coverage Ratio</h4>
              <p className="text-sm text-gray-300">
                Global coverage ratio: {(coverageRatio * 100).toFixed(2)}%
                <br />
                Profits may be haircut on withdrawal. System will self-heal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Ratio Card */}
      <div className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-semibold mb-4">Percolator Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Coverage Ratio (h)</p>
            <p className={`text-2xl font-bold ${
              coverageRatio >= 0.9 ? 'text-green-400' :
              coverageRatio >= 0.7 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {(coverageRatio * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Active Positions</p>
            <p className="text-2xl font-bold">{positions.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Notional</p>
            <p className="text-2xl font-bold">
              {positions.reduce((sum, p) => sum + Math.abs(p.position_size * p.entry_price), 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total PnL</p>
            <p className={`text-2xl font-bold ${
              positions.reduce((sum, p) => sum + p.unrealized_pnl, 0) >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {positions.reduce((sum, p) => sum + p.unrealized_pnl, 0).toFixed(4)} SOL
            </p>
          </div>
        </div>
      </div>

      {/* Positions List */}
      {positions.length === 0 ? (
        <div className="text-center py-12 bg-hawk-dark/30 rounded-lg border border-gray-800">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No perp positions</h3>
          <p className="text-gray-400 mb-4">
            Open perpetual positions to hedge your LP or trade directionally
          </p>
          <button className="px-6 py-2 bg-hawk-primary rounded hover:bg-hawk-primary/90 transition-colors">
            Open Position
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => (
            <div
              key={position.id}
              className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6 hover:border-hawk-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <span>
                      {position.position_size > 0 ? '📈 LONG' : '📉 SHORT'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      (User #{position.percolator_user_idx})
                    </span>
                  </h3>
                  {position.lp_position_id && (
                    <p className="text-sm text-hawk-primary">
                      🔗 Hedging LP Position
                    </p>
                  )}
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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Position Size</p>
                  <p className="font-mono font-semibold">
                    {Math.abs(position.position_size).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Entry Price</p>
                  <p className="font-mono">${position.entry_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Capital</p>
                  <p className="font-mono">{position.capital.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-gray-400">Unrealized PnL</p>
                  <p className={`font-mono font-semibold ${
                    position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.unrealized_pnl >= 0 ? '+' : ''}
                    {position.unrealized_pnl.toFixed(4)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Effective PnL</p>
                  <p className="font-mono text-hawk-primary">
                    {(position.unrealized_pnl * coverageRatio).toFixed(4)} SOL
                  </p>
                  <p className="text-xs text-gray-500">
                    (haircut: {((1 - coverageRatio) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm">
                  Close Position
                </button>
                <button className="px-4 py-2 bg-hawk-primary/20 text-hawk-primary rounded hover:bg-hawk-primary/30 transition-colors text-sm">
                  Add Margin
                </button>
                <button className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded hover:bg-gray-700 transition-colors text-sm">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-blue-400 mb-2">ℹ️ About Percolator</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Profits must mature before withdrawal (junior claims)</li>
          <li>• Coverage ratio (h) determines profit backing</li>
          <li>• System self-heals as market conditions improve</li>
          <li>• No forced position closures (unlike traditional ADL)</li>
          <li>• Inverted market: Long = profit if SOL drops</li>
        </ul>
      </div>
    </div>
  );
}
