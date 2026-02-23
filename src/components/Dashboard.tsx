import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import PositionsList from './PositionsList';
import StrategiesList from './StrategiesList';
import MLSignals from './MLSignals';
import CreateStrategy from './CreateStrategy';
import PerpPositions from './PerpPositions';

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'positions' | 'strategies' | 'signals' | 'perps'>('positions');

  return (
    <div className="min-h-screen bg-gradient-to-br from-hawk-darker via-hawk-dark to-hawk-darker">
      {/* Header */}
      <header className="border-b border-gray-800 bg-hawk-dark/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🦅</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-hawk-primary to-hawk-secondary bg-clip-text text-transparent">
                  HawkFi HFL
                </h1>
                <p className="text-sm text-gray-400">Precision LP Management</p>
              </div>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦅</div>
            <h2 className="text-3xl font-bold mb-4">Welcome to HawkFi</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to start managing LP positions with AI-powered precision
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex space-x-4 mb-8 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'positions'
                    ? 'text-hawk-primary border-b-2 border-hawk-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                LP Positions
              </button>
              <button
                onClick={() => setActiveTab('perps')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'perps'
                    ? 'text-hawk-primary border-b-2 border-hawk-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Perp Positions
              </button>
              <button
                onClick={() => setActiveTab('strategies')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'strategies'
                    ? 'text-hawk-primary border-b-2 border-hawk-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Strategies
              </button>
              <button
                onClick={() => setActiveTab('signals')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'signals'
                    ? 'text-hawk-primary border-b-2 border-hawk-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ML Signals
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'positions' && <PositionsList walletAddress={publicKey!.toString()} />}
            {activeTab === 'perps' && <PerpPositions walletAddress={publicKey!.toString()} />}
            {activeTab === 'strategies' && (
              <div className="space-y-6">
                <CreateStrategy walletAddress={publicKey!.toString()} />
                <StrategiesList walletAddress={publicKey!.toString()} />
              </div>
            )}
            {activeTab === 'signals' && <MLSignals />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              Powered by Helius • MagicBlock • OpenRouter • Supabase
            </div>
            <div>
              69-bin Precision Curve • MCU Up-only • ML Ensemble
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
