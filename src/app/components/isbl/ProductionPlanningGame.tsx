import { useState, useMemo } from 'react';
import { BarChart, MessageSquare, Package, LogOut, RotateCcw, X, Play, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ScenarioDefinition } from '@/app/types/classes';
import type { ProductionPlanningScenario } from '@/app/types/classes';

interface ProductionPlanningGameProps {
  scenario: ScenarioDefinition;
  productionPlanning: ProductionPlanningScenario;
  onLeave: () => void;
}

type GameState = 'observe' | 'decisions' | 'executing' | 'reflection' | 'analytics';

export interface PeriodResult {
  period: number;
  demand: number;
  orderQty: number;
  periodCost: number;
  cumulativeCost: number;
}

const PERIODS = 12;
const EXECUTION_MS = 1200;

const reflectionPrompts: { period: number; question: string; hint: string }[] = [
  { period: 1, question: 'How did your first order quantity affect this period’s cost? What’s the trade-off between ordering too much (holding) and too little (more orders)?', hint: 'EOQ balances holding and ordering cost.' },
  { period: 2, question: 'Did you adjust Q after seeing period 1’s cost? How does the demand pattern (stable, trend, or seasonal) influence your decision?', hint: 'Match order size to expected demand.' },
  { period: 3, question: 'Reflect on cumulative cost so far. Would a fixed Q every period be better, or varying Q with demand?', hint: 'Consider (Q/2)×H/12 vs (D/12)×S/Q.' },
  { period: 4, question: 'How close was your Q to the demand this period? What would happen if you always ordered exactly the demand?', hint: 'Ordering every period increases ordering cost.' },
  { period: 6, question: 'Halfway through: is your total cost trending up or down? What would you change for the remaining periods?', hint: 'Review EOQ: √(2DS/H) for annual; scale to per period.' },
  { period: 9, question: 'With three periods left, how are you balancing holding cost and ordering cost?', hint: 'Larger Q = less frequent orders but more holding.' },
  { period: 12, question: 'Game complete. What was your main takeaway about production planning and the EOQ trade-off?', hint: 'Optimal Q minimizes total cost over the planning horizon.' },
];

function getReflection(period: number) {
  const exact = reflectionPrompts.find((p) => p.period === period);
  if (exact) return exact;
  const before = reflectionPrompts.filter((p) => p.period <= period).pop();
  return before ?? reflectionPrompts[0];
}

/** EOQ-style production planning game: same flow as Strategy Planning (observe → decide → execute → reflection). */
export function ProductionPlanningGame({ scenario, productionPlanning, onLeave }: ProductionPlanningGameProps) {
  const { H, D, S, pattern } = productionPlanning;

  const [gameState, setGameState] = useState<GameState>('observe');
  const [periodHistory, setPeriodHistory] = useState<PeriodResult[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [orderQtyInput, setOrderQtyInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const demandForPeriod = (p: number) => {
    const base = D / 12;
    if (pattern === 'horizontal') return Math.round(base);
    if (pattern === 'trend') return Math.round(base * (0.8 + (p / 12) * 0.4));
    if (pattern === 'seasonal') return Math.round(base * (0.7 + 0.3 * Math.sin((p / 12) * 2 * Math.PI * 2)));
    return Math.round(base);
  };

  const periodCost = (q: number) => {
    if (q <= 0) return 0;
    const holding = (q / 2) * (H / 12);
    const ordering = (D / 12) * (S / q);
    return Math.round(holding + ordering);
  };

  const eoqAnnual = useMemo(() => Math.round(Math.sqrt((2 * D * S) / H)), [D, S, H]);
  const eoqPeriodHint = Math.round(eoqAnnual / 12);

  const cumulativeSoFar = periodHistory.length > 0 ? periodHistory[periodHistory.length - 1].cumulativeCost : 0;
  const demandThisPeriod = demandForPeriod(currentPeriod);

  const handleRunPeriod = () => {
    const q = Math.max(0, Math.round(Number(orderQtyInput) || 0));
    setGameState('executing');
    setIsExecuting(true);

    const timer = setTimeout(() => {
      const cost = periodCost(q);
      const newCumulative = cumulativeSoFar + cost;
      const result: PeriodResult = {
        period: currentPeriod,
        demand: demandThisPeriod,
        orderQty: q,
        periodCost: cost,
        cumulativeCost: newCumulative,
      };
      setPeriodHistory((prev) => [...prev, result]);
      setOrderQtyInput('');
      setIsExecuting(false);
      setGameState('reflection');
    }, EXECUTION_MS);
    return () => clearTimeout(timer);
  };

  const handleContinueFromReflection = () => {
    if (currentPeriod >= PERIODS) {
      setGameState('observe');
      return;
    }
    setCurrentPeriod((p) => p + 1);
    setGameState('observe');
  };

  const handleReset = () => {
    setPeriodHistory([]);
    setCurrentPeriod(1);
    setOrderQtyInput('');
    setGameState('observe');
  };

  const lastResult = periodHistory.length > 0 ? periodHistory[periodHistory.length - 1] : null;
  const totalCostEnd = periodHistory.length > 0 ? periodHistory[periodHistory.length - 1].cumulativeCost : 0;
  const gameComplete = periodHistory.length >= PERIODS;

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-indigo-950/25 to-slate-950">
      {/* Top bar – same structure as Strategy Planning */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-700/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/95 rounded-xl px-5 py-2.5 border border-slate-600/50 shadow-lg">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Period</span>
                <div className="text-2xl font-bold text-white leading-tight">
                  {gameComplete ? PERIODS : currentPeriod}
                </div>
                <span className="text-slate-500 text-[10px]">of {PERIODS}</span>
              </div>
              <div className="rounded-full border border-slate-600 bg-slate-800/90 px-4 py-2 text-xs text-slate-300">
                {scenario.title}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-slate-800/90 rounded-lg px-3 py-1.5 border border-slate-600/50">
                <span className="text-slate-500 text-[10px] uppercase">Objective</span>
                <span className="text-amber-300 font-semibold text-sm block">Minimize total cost (holding + ordering)</span>
              </div>
              <div className="bg-slate-800/90 rounded-lg px-4 py-2 border border-slate-600/50">
                <span className="text-slate-500 text-[10px] uppercase block">Cumulative cost</span>
                <span className="text-lg font-bold text-white">${(lastResult?.cumulativeCost ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGameState(gameState === 'decisions' ? 'observe' : 'decisions')}
                  disabled={isExecuting || gameState === 'reflection' || gameComplete}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    gameState === 'decisions'
                      ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-400/40 border border-teal-400'
                      : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-600/50 disabled:opacity-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Orders
                </button>
                <button
                  onClick={() => setGameState(gameState === 'analytics' ? 'observe' : 'analytics')}
                  disabled={isExecuting || gameState === 'reflection'}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    gameState === 'analytics'
                      ? 'bg-slate-600 text-white border border-slate-500'
                      : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-600/50 disabled:opacity-50'
                  }`}
                >
                  <BarChart className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => setGameState(gameState === 'reflection' ? 'observe' : 'reflection')}
                  disabled={isExecuting || periodHistory.length === 0}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    gameState === 'reflection'
                      ? 'bg-slate-600 text-white border border-slate-500'
                      : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-600/50 disabled:opacity-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Reflection
                </button>
                <button
                  onClick={handleReset}
                  disabled={isExecuting}
                  className="px-3 py-2 rounded-xl bg-slate-800/90 text-slate-400 hover:bg-slate-700 border border-slate-600/50 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={onLeave}
                  className="ml-2 px-4 py-2 rounded-xl bg-amber-600/90 text-white hover:bg-amber-500 border border-amber-500/50 flex items-center gap-2 font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main view – production flow (Order → Inventory → Demand) */}
      <div
        className={`absolute inset-0 pt-20 pb-24 transition-all duration-500 flex flex-col items-center justify-center ${
          gameState === 'decisions' || gameState === 'analytics' || gameState === 'reflection'
            ? 'blur-sm scale-95 brightness-50'
            : 'blur-0 scale-100 brightness-100'
        }`}
      >
        <div className="max-w-2xl w-full px-6">
          <p className="text-sm text-slate-400 mb-6 text-center">{scenario.context}</p>
          <div className="grid grid-cols-3 gap-3 mb-8 text-sm">
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 text-center">
              <div className="text-slate-400 text-xs">H (holding $/unit/yr)</div>
              <div className="font-semibold text-white">{H}</div>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 text-center">
              <div className="text-slate-400 text-xs">D (demand units/yr)</div>
              <div className="font-semibold text-white">{D.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 text-center">
              <div className="text-slate-400 text-xs">S (ordering $/lot)</div>
              <div className="font-semibold text-white">{S}</div>
            </div>
          </div>

          {/* Production flow visual */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Your order Q</div>
                <div className="text-2xl font-bold text-sky-300">
                  {lastResult ? lastResult.orderQty : '—'}
                </div>
                <div className="text-[10px] text-slate-500">last period</div>
              </div>
              <div className="text-slate-600">→</div>
              <div className="flex-1 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Period demand</div>
                <div className="text-2xl font-bold text-amber-300">{demandThisPeriod}</div>
                <div className="text-[10px] text-slate-500">units</div>
              </div>
              <div className="text-slate-600">→</div>
              <div className="flex-1 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cost (formula)</div>
                <div className="text-sm font-mono text-emerald-300">(Q/2)×H/12 + (D/12)×S/Q</div>
              </div>
            </div>
          </div>

          {gameState === 'observe' && !gameComplete && !isExecuting && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/95 backdrop-blur-sm rounded-2xl px-5 py-4 border border-slate-600/50 shadow-xl text-center"
            >
              <p className="text-sm text-slate-300">
                Period <span className="font-semibold text-white">{currentPeriod}</span>: demand this period is{' '}
                <span className="font-semibold text-amber-300">{demandThisPeriod} units</span>. Choose your order quantity Q and run the period.
              </p>
            </motion.div>
          )}
          {gameComplete && (
            <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-2xl px-6 py-5 text-center">
              <div className="text-lg font-semibold text-emerald-300 mb-1">Simulation complete</div>
              <div className="text-2xl font-bold text-white">Total cost: ${totalCostEnd.toLocaleString()}</div>
              <p className="text-sm text-slate-400 mt-2">Review Analytics and Reflection to reflect on your decisions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-700/40">
        <button
          onClick={() => setGameState(gameState === 'decisions' ? 'observe' : 'decisions')}
          disabled={isExecuting || gameState === 'reflection' || gameComplete}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 text-white border border-slate-600/50 hover:bg-slate-700 font-medium text-sm disabled:opacity-50"
        >
          <Package className="w-5 h-5" />
          Orders
        </button>
        <button
          onClick={() => {
            if (gameState === 'decisions') handleRunPeriod();
            else if (gameState === 'reflection') handleContinueFromReflection();
            else if (gameState === 'observe' && !gameComplete) setGameState('decisions');
          }}
          disabled={isExecuting || (gameState === 'decisions' && (Number(orderQtyInput) || 0) < 0) || gameComplete}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold text-sm shadow-lg shadow-teal-400/40 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gameComplete ? (
            'Done'
          ) : gameState === 'decisions' ? (
            <>
              <Play className="w-5 h-5" />
              Run period
            </>
          ) : gameState === 'reflection' ? (
            'Continue'
          ) : (
            <>
              <Play className="w-5 h-5" />
              Next period
            </>
          )}
        </button>
      </div>

      {/* Decisions panel – slide from left */}
      <AnimatePresence>
        {gameState === 'decisions' && (
          <motion.div
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-0 top-20 bottom-0 w-[380px] z-40"
          >
            <div className="h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 shadow-2xl flex flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between p-4 pb-2">
                <h2 className="text-lg font-bold text-white">Decide – Period {currentPeriod}</h2>
                <button
                  onClick={() => setGameState('observe')}
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4">
                <p className="text-xs text-slate-400">
                  Demand this period: <span className="font-semibold text-amber-300">{demandThisPeriod} units</span>. Cost formula: C = (Q/2)×H/12 + (D/12)×S/Q.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order quantity Q</label>
                  <input
                    type="number"
                    min="0"
                    value={orderQtyInput}
                    onChange={(e) => setOrderQtyInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white text-lg"
                    placeholder="e.g. 800"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">EOQ (annual) ≈ {eoqAnnual}; per-period hint ≈ {eoqPeriodHint} units</p>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700">
                  <div className="text-xs text-slate-400">Cost this period (preview)</div>
                  <div className="text-lg font-bold text-white">${periodCost(Number(orderQtyInput) || 0).toLocaleString()}</div>
                </div>
                <button
                  onClick={handleRunPeriod}
                  disabled={isExecuting}
                  className="w-full py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold flex items-center justify-center gap-2 hover:bg-teal-400 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  Run period
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics panel – slide from right */}
      <AnimatePresence>
        {gameState === 'analytics' && (
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-20 bottom-0 w-[400px] z-40"
          >
            <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                  Analytics
                </h2>
                <button
                  onClick={() => setGameState('observe')}
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Cumulative cost</div>
                  <div className="text-2xl font-bold text-white">${(lastResult?.cumulativeCost ?? 0).toLocaleString()}</div>
                </div>
                <div className="text-sm font-medium text-slate-300">Cost by period</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {periodHistory.map((r) => (
                    <div key={r.period} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50">
                      <span className="text-slate-300">P{r.period}</span>
                      <span className="text-slate-400 text-xs">D: {r.demand} Q: {r.orderQty}</span>
                      <span className="font-semibold text-white">${r.periodCost}</span>
                    </div>
                  ))}
                  {periodHistory.length === 0 && (
                    <p className="text-slate-500 text-sm">Run periods to see cost history.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reflection panel – centered */}
      <AnimatePresence>
        {gameState === 'reflection' && lastResult && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 flex justify-center p-4 sm:p-8 overflow-y-auto bg-slate-950/85 backdrop-blur-sm"
          >
            <div className="w-full max-w-2xl my-6">
              <div className="bg-slate-900/98 backdrop-blur-xl rounded-2xl border-2 border-teal-500/60 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Reflection – Period {lastResult.period}</h2>
                      <p className="text-sm text-teal-100">Review your decision and cost</p>
                    </div>
                    <button
                      onClick={() => setGameState('observe')}
                      className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                      <div className="text-xs text-slate-400">Demand</div>
                      <div className="text-xl font-bold text-white">{lastResult.demand}</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                      <div className="text-xs text-slate-400">Your Q</div>
                      <div className="text-xl font-bold text-sky-300">{lastResult.orderQty}</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                      <div className="text-xs text-slate-400">Period cost</div>
                      <div className="text-xl font-bold text-amber-300">${lastResult.periodCost}</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                      <div className="text-xs text-slate-400">Cumulative</div>
                      <div className="text-xl font-bold text-white">${lastResult.cumulativeCost.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <div className="text-sm font-medium text-slate-300 mb-2">{getReflection(lastResult.period).question}</div>
                    <p className="text-xs text-slate-500">Hint: {getReflection(lastResult.period).hint}</p>
                  </div>
                  <button
                    onClick={handleContinueFromReflection}
                    className="w-full py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold flex items-center justify-center gap-2 hover:bg-teal-400"
                  >
                    {currentPeriod >= PERIODS ? 'Done' : 'Continue to next period'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executing overlay */}
      {isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-sm px-8 py-6 rounded-2xl border border-teal-500/50 shadow-2xl shadow-teal-500/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">Executing decision</div>
                <div className="text-sm text-slate-400">Running period — opening reflection next.</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
