import { useState, useMemo } from 'react';
import { Clock, ArrowRight, Trophy, Medal, Star, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RoundData {
  round: number;
  orderQty: number;
  productionQty: number;
  inventory: number;
  stockouts: number;
  orderingCost: number;
  holdingCost: number;
  stockoutCost: number;
  totalCost: number;
  serviceLevel: number;
}

const initialRounds: RoundData[] = [
  {
    round: 1,
    orderQty: 100,
    productionQty: 100,
    inventory: 20,
    stockouts: 0,
    orderingCost: 500,
    holdingCost: 40,
    stockoutCost: 0,
    totalCost: 540,
    serviceLevel: 100,
  },
  {
    round: 2,
    orderQty: 120,
    productionQty: 120,
    inventory: 35,
    stockouts: 0,
    orderingCost: 600,
    holdingCost: 70,
    stockoutCost: 0,
    totalCost: 670,
    serviceLevel: 100,
  },
  {
    round: 3,
    orderQty: 80,
    productionQty: 80,
    inventory: 15,
    stockouts: 5,
    orderingCost: 400,
    holdingCost: 30,
    stockoutCost: 250,
    totalCost: 680,
    serviceLevel: 94,
  },
  {
    round: 4,
    orderQty: 110,
    productionQty: 110,
    inventory: 28,
    stockouts: 0,
    orderingCost: 550,
    holdingCost: 56,
    stockoutCost: 0,
    totalCost: 606,
    serviceLevel: 100,
  },
  {
    round: 5,
    orderQty: 95,
    productionQty: 95,
    inventory: 22,
    stockouts: 2,
    orderingCost: 475,
    holdingCost: 44,
    stockoutCost: 100,
    totalCost: 619,
    serviceLevel: 98,
  },
];

const badges = [
  { name: 'Perfect Service', icon: Trophy, color: 'text-yellow-500', earned: true },
  { name: 'Cost Optimizer', icon: Target, color: 'text-blue-500', earned: true },
  { name: 'Quick Learner', icon: Star, color: 'text-purple-500', earned: false },
  { name: 'Master Planner', icon: Medal, color: 'text-green-500', earned: false },
];

export function StudentDashboard() {
  const [currentRound, setCurrentRound] = useState(3);
  const [rounds, setRounds] = useState<RoundData[]>(initialRounds.slice(0, 3));
  const [orderQty, setOrderQty] = useState('100');
  const [productionQty, setProductionQty] = useState('100');
  const [allocation, setAllocation] = useState('80');
  const [reflection, setReflection] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(245); // seconds

  const avgServiceLevel = useMemo(() => {
    return rounds.reduce((acc, r) => acc + r.serviceLevel, 0) / rounds.length;
  }, [rounds]);

  const totalCost = useMemo(() => {
    return rounds.reduce((acc, r) => acc + r.totalCost, 0);
  }, [rounds]);

  const handleNextRound = () => {
    if (currentRound < 5) {
      const newRound = currentRound + 1;
      setCurrentRound(newRound);
      setRounds(initialRounds.slice(0, newRound));
      setReflection('');
    }
  };

  const costBreakdownData = rounds.map((r) => ({
    round: `R${r.round}`,
    Ordering: r.orderingCost,
    Holding: r.holdingCost,
    Stockout: r.stockoutCost,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-1">Supply Chain Strategy Simulation</h1>
            <p className="text-blue-100">Master the art of inventory management</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-blue-100">Current Round</div>
              <div className="text-3xl">{currentRound}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100 flex items-center gap-1 justify-end">
                <Clock className="w-4 h-4" />
                Time Left
              </div>
              <div className="text-3xl">
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* Service Level Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-100">Average Service Level</span>
            <span className="text-sm font-semibold">{avgServiceLevel.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-blue-800 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                avgServiceLevel >= 95 ? 'bg-green-400' : avgServiceLevel >= 85 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${avgServiceLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Decision Input */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Decision Input</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Order Quantity</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Production Quantity</label>
                <input
                  type="number"
                  value={productionQty}
                  onChange={(e) => setProductionQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Allocation</label>
                <input
                  type="number"
                  value={allocation}
                  onChange={(e) => setAllocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter allocation"
                />
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Submit Decision
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    badge.earned
                      ? 'border-current bg-slate-50'
                      : 'border-slate-200 bg-white opacity-50 grayscale'
                  }`}
                >
                  <badge.icon className={`w-8 h-8 mx-auto mb-1 ${badge.color}`} />
                  <div className="text-xs text-center text-slate-600">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Performance Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Cost</span>
                <span className="text-lg font-semibold text-slate-800">${totalCost}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Avg Service Level</span>
                <span className="text-lg font-semibold text-green-600">{avgServiceLevel.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Rounds Played</span>
                <span className="text-lg font-semibold text-slate-800">{currentRound}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Results Table */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Round Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm text-slate-600 pb-2 px-2">Round</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Order</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Inventory</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Stockouts</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Cost</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Service %</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => (
                    <tr key={round.round} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-semibold text-slate-800">{round.round}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{round.orderQty}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{round.inventory}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={round.stockouts > 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                          {round.stockouts}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700">${round.totalCost}</td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            round.serviceLevel >= 95
                              ? 'text-green-600'
                              : round.serviceLevel >= 85
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {round.serviceLevel >= 95 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {round.serviceLevel}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leaderboard Snapshot */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Class Leaderboard</h2>
            <div className="space-y-2">
              {[
                { rank: 1, name: 'Sarah Chen', score: 2450, you: false },
                { rank: 2, name: 'You', score: 2115, you: true },
                { rank: 3, name: 'Mike Johnson', score: 2080, you: false },
                { rank: 4, name: 'Emma Davis', score: 1995, you: false },
                { rank: 5, name: 'Alex Kim', score: 1890, you: false },
              ].map((student) => (
                <div
                  key={student.rank}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    student.you ? 'bg-blue-50 border-2 border-blue-300' : 'bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      student.rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : student.rank === 2
                        ? 'bg-slate-300 text-slate-700'
                        : student.rank === 3
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {student.rank}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{student.name}</div>
                  </div>
                  <div className="font-semibold text-slate-700">{student.score} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Charts */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Inventory Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rounds}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="round" tickFormatter={(v) => `R${v}`} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="inventory" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Cost Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="round" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ordering" fill="#3b82f6" />
                <Bar dataKey="Holding" fill="#f59e0b" />
                <Bar dataKey="Stockout" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Heatmap */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Performance vs. Class</h3>
            <div className="grid grid-cols-5 gap-2">
              {rounds.map((round) => {
                const performance = round.serviceLevel >= 95 ? 'high' : round.serviceLevel >= 85 ? 'medium' : 'low';
                return (
                  <div key={round.round} className="text-center">
                    <div
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                        performance === 'high'
                          ? 'bg-green-500 text-white'
                          : performance === 'medium'
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {round.serviceLevel}%
                    </div>
                    <div className="text-xs text-slate-600 mt-1">R{round.round}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-slate-600">High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded" />
                <span className="text-slate-600">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-slate-600">Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Reflection */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Reflection Prompt</h2>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
          <p className="text-slate-700">
            Why did your inventory cost {rounds[rounds.length - 1]?.stockouts > 0 ? 'increase' : 'change'} in Round{' '}
            {currentRound}? What decision would you make differently next time?
          </p>
        </div>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="Type your reflection here..."
        />
        <div className="flex items-center justify-between mt-4">
          <button className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
            Save Reflection
          </button>
          <button
            onClick={handleNextRound}
            disabled={currentRound >= 5}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {currentRound >= 5 ? 'Simulation Complete' : 'Next Round'}
            {currentRound < 5 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
