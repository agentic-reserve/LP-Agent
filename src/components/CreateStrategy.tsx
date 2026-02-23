import { useState } from 'react';

export default function CreateStrategy({ walletAddress }: { walletAddress: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    strategyType: 'hfl',
    precisionBins: 69,
    mcuEnabled: false,
    autoRebalance: true,
    mlEnabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...formData,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create strategy:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 bg-gradient-to-r from-hawk-primary to-hawk-secondary rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        + Create New Strategy
      </button>
    );
  }

  return (
    <div className="bg-hawk-dark/30 rounded-lg border border-gray-800 p-6">
      <h3 className="text-xl font-semibold mb-4">Create HFL Strategy</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Strategy Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-hawk-dark border border-gray-700 rounded focus:border-hawk-primary outline-none"
            placeholder="My HFL Strategy"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Strategy Type</label>
          <select
            value={formData.strategyType}
            onChange={(e) => setFormData({ ...formData, strategyType: e.target.value })}
            className="w-full px-4 py-2 bg-hawk-dark border border-gray-700 rounded focus:border-hawk-primary outline-none"
          >
            <option value="hfl">HFL (High-Frequency Liquidity)</option>
            <option value="precision_curve">Precision Curve</option>
            <option value="mcu">MCU (Market Cap Up-only)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Precision Bins</label>
          <input
            type="number"
            value={formData.precisionBins}
            onChange={(e) => setFormData({ ...formData, precisionBins: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-hawk-dark border border-gray-700 rounded focus:border-hawk-primary outline-none"
            min="10"
            max="100"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.mcuEnabled}
              onChange={(e) => setFormData({ ...formData, mcuEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Enable MCU (Up-only bias)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.autoRebalance}
              onChange={(e) => setFormData({ ...formData, autoRebalance: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto Rebalance</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.mlEnabled}
              onChange={(e) => setFormData({ ...formData, mlEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">ML Signals (minimax/deepseek)</span>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className="flex-1 py-2 bg-hawk-primary rounded hover:bg-hawk-primary/90 transition-colors"
          >
            Create Strategy
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
