import { useState, useEffect } from 'react';

interface MLSignal {
  id: string;
  signal_type: string;
  confidence: number;
  action: string;
  urgency: string;
  predicted_price: number;
  created_at: string;
}

export default function MLSignals() {
  const [signals, setSignals] = useState<MLSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      const response = await fetch('/api/ml/metrics');
      const data = await response.json();
      // Mock signals for demo
      setSignals([]);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading ML signals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-semibold mb-4">ML Ensemble Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Primary Model</p>
            <p className="font-semibold text-hawk-primary">minimax-m2.5</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Fallback Model</p>
            <p className="font-semibold text-hawk-secondary">deepseek-v3.1</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Confidence Threshold</p>
            <p className="font-semibold">≥90%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Active Signals</p>
            <p className="font-semibold">{signals.length}</p>
          </div>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-12 bg-hawk-dark/30 rounded-lg border border-gray-800">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">No active signals</h3>
          <p className="text-gray-400">ML predictions will appear here when confidence ≥90%</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{signal.action.toUpperCase()}</h4>
                  <p className="text-sm text-gray-400">{signal.signal_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-hawk-primary">{signal.confidence}%</p>
                  <p className="text-sm text-gray-400">{signal.urgency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
