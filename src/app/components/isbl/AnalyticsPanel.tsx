import { X, TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RoundData } from './StudentDashboard';

interface AnalyticsPanelProps {
  rounds: RoundData[];
  currentRound: number;
  onClose: () => void;
  gameMode?: boolean;
}

export function AnalyticsPanel({ rounds, currentRound, onClose, gameMode }: AnalyticsPanelProps) {
  const inventoryData = rounds.map((r) => ({
    round: `R${r.round}`,
    Supplier: r.supplierInventory,
    Factory: r.factoryInventory,
    'WH-A': r.warehouseAInventory,
    'WH-B': r.warehouseBInventory,
    DC: r.dcInventory,
  }));

  const costData = rounds.map((r) => ({
    round: `R${r.round}`,
    Ordering: r.orderingCost,
    Holding: r.holdingCost,
    Stockout: r.stockoutCost,
  }));

  const currentData = rounds[rounds.length - 1];
  const avgServiceLevel = rounds.reduce((acc, r) => acc + r.serviceLevel, 0) / rounds.length;
  const totalCost = rounds.reduce((acc, r) => acc + r.totalCost, 0);
  const totalStockouts = rounds.reduce((acc, r) => acc + r.stockouts, 0);

  // Calculate trend
  const costTrend = rounds.length > 1 ? currentData.totalCost - rounds[rounds.length - 2].totalCost : 0;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Performance Analytics</h2>
          <p className="text-sm text-slate-400">Analyze outcomes and system behavior</p>
        </div>
        {gameMode && (
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Service Level</span>
            <Target className="w-5 h-5 text-blue-200" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">{currentData.serviceLevel.toFixed(1)}%</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-blue-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-200 transition-all duration-500"
                style={{ width: `${currentData.serviceLevel}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-200">Avg: {avgServiceLevel.toFixed(1)}%</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 shadow-lg shadow-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm font-medium">Total Cost</span>
            <DollarSign className="w-5 h-5 text-purple-200" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">${totalCost}</div>
          <div className="flex items-center gap-2">
            {costTrend !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${costTrend > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {costTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                ${Math.abs(costTrend)}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-purple-200">Current: ${currentData.totalCost}</div>
        </div>

        <div className={`bg-gradient-to-br ${totalStockouts > 0 ? 'from-red-600 to-red-700' : 'from-green-600 to-green-700'} rounded-xl p-5 shadow-lg ${totalStockouts > 0 ? 'shadow-red-500/20' : 'shadow-green-500/20'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${totalStockouts > 0 ? 'text-red-100' : 'text-green-100'} text-sm font-medium`}>
              Stockouts
            </span>
            {totalStockouts > 0 ? (
              <AlertCircle className="w-5 h-5 text-red-200" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-200" />
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-2">{totalStockouts}</div>
          <div className={`text-xs ${totalStockouts > 0 ? 'text-red-200' : 'text-green-200'}`}>
            {totalStockouts > 0 ? 'Service impact detected' : 'Perfect availability'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl p-5 shadow-lg shadow-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100 text-sm font-medium">Efficiency</span>
            <TrendingUp className="w-5 h-5 text-yellow-200" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {((avgServiceLevel / 100) * (3000 / totalCost)).toFixed(1)}
          </div>
          <div className="text-xs text-yellow-200">Service vs Cost ratio</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Inventory Trends */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            Inventory Levels Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={inventoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="round" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Supplier" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Factory" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="WH-A" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="WH-B" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="DC" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3">
            <span className="font-semibold text-slate-300">Insight:</span> Track how inventory moves through the supply
            chain. Peaks indicate buildup; valleys show potential stockout risk.
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-5 bg-purple-500 rounded-full" />
            Cost Breakdown by Round
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="round" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Ordering" fill="#3b82f6" />
              <Bar dataKey="Holding" fill="#f59e0b" />
              <Bar dataKey="Stockout" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3">
            <span className="font-semibold text-slate-300">Trade-off:</span> Red bars (stockout costs) indicate service
            failures. Orange bars (holding costs) show inventory storage expenses.
          </div>
        </div>

        {/* Round-by-Round Analysis */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-5 bg-green-500 rounded-full" />
            Round-by-Round Performance
          </h3>
          <div className="space-y-2">
            {rounds.map((round, index) => {
              const trend = index > 0 ? round.totalCost - rounds[index - 1].totalCost : 0;
              return (
                <div
                  key={round.round}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    round.round === currentRound ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-white">R{round.round}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">${round.totalCost}</div>
                      <div className="text-xs text-slate-400">SL: {round.serviceLevel.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {round.stockouts > 0 && (
                      <div className="px-2 py-1 bg-red-500/20 rounded text-xs text-red-400 font-semibold">
                        {round.stockouts} stockouts
                      </div>
                    )}
                    {index > 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold ${
                          trend > 0 ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        ${Math.abs(trend)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
