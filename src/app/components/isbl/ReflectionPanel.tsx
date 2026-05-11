import { useState } from 'react';
import { MessageSquare, Lightbulb, ArrowRight, X } from 'lucide-react';
import type { RoundData } from './StudentDashboard';

interface ReflectionPanelProps {
  currentRound: number;
  currentData: RoundData;
  onContinue: () => void;
  onClose: () => void;
}

const reflectionPrompts = [
  {
    round: 1,
    question:
      'Analyze your initial decision. How did your order quantity and production rate affect the downstream inventory levels across the supply chain?',
    hint: 'Consider the flow from supplier to customer. Did materials accumulate anywhere?',
  },
  {
    round: 2,
    question:
      'Explain why your holding cost changed from Round 1. What trade-off did you observe between maintaining service levels and controlling inventory costs?',
    hint: 'Higher inventory ensures availability but increases holding costs.',
  },
  {
    round: 3,
    question:
      'If you experienced stockouts this round, trace the decision path that led to this outcome. Which station in the supply chain became the bottleneck and why?',
    hint: 'Look at where inventory dropped to critical levels first.',
  },
  {
    round: 4,
    question:
      'How did adjusting your warehouse distribution priority affect overall system performance? Was the allocation strategy optimal for customer demand?',
    hint: 'Unbalanced distribution can create localized stockouts.',
  },
  {
    round: 5,
    question:
      'Reflect on your overall strategy across all rounds. What pattern emerged in your decision-making? What would you change if starting over?',
    hint: 'Look for reactive vs. proactive patterns in your responses.',
  },
];

export function ReflectionPanel({
  currentRound,
  currentData,
  rounds = [],
  orderPipeline,
  onContinue,
  onClose,
}: ReflectionPanelProps) {
  const [reflection, setReflection] = useState('');
  const [showHint, setShowHint] = useState(false);

  const prompt = reflectionPrompts.find((p) => p.round === currentRound) || reflectionPrompts[0];
  const twoRoundsAgo = currentRound >= 3 && rounds.length >= currentRound - 1 ? rounds[currentRound - 2] : null;
  const displayedVsActual =
    currentData.displayedDemand != null && currentData.displayedDemand !== currentData.customerDemand;

  return (
    <div className="bg-slate-900/98 backdrop-blur-xl rounded-2xl border-2 border-sky-500/60 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Reflection Required</h2>
              <p className="text-sm text-blue-100">Round {currentRound} - Analyze your decisions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Round Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-white">${currentData.totalCost}</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">Service Level</div>
            <div
              className={`text-2xl font-bold ${
                currentData.serviceLevel >= 95
                  ? 'text-green-400'
                  : currentData.serviceLevel >= 85
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {currentData.serviceLevel.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">Stockouts</div>
            <div className={`text-2xl font-bold ${currentData.stockouts > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {currentData.stockouts}
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1">True demand</div>
            <div className="text-2xl font-bold text-blue-400">{currentData.customerDemand} units</div>
            {displayedVsActual && (
              <div className="text-[10px] text-slate-400 mt-1">Reported during round: ~{currentData.displayedDemand} units</div>
            )}
          </div>
        </div>

        {/* Cause & effect: delayed consequence */}
        {twoRoundsAgo && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-amber-200 mb-2">🔗 Cause & effect (delayed)</h4>
            <p className="text-sm text-slate-200">
              Two rounds ago you ordered <span className="font-bold text-white">{twoRoundsAgo.orderQty} units</span>.
              That order just arrived this round. Your factory inventory is now{' '}
              <span className="font-bold text-white">{currentData.factoryInventory}</span>. Did that past decision help
              or hurt? No calculation—just notice the lag between deciding and feeling the result.
            </p>
          </div>
        )}

        {/* Reflection Prompt */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-sky-600/15 via-cyan-600/15 to-emerald-600/15 border-l-4 border-sky-500 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2 text-lg">How did it feel?</h3>
                <p className="text-slate-200 leading-relaxed">{prompt.question}</p>
              </div>
            </div>
          </div>

          {/* Hint Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowHint(!showHint)}
              className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
          </div>

          {/* Hint Content */}
          {showHint && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-yellow-400 mb-1">Hint</div>
                  <p className="text-sm text-slate-300">{prompt.hint}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reflection Input */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Your Analysis</label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full h-40 px-5 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              placeholder="What did you feel when you saw the numbers? What did you want to do? What did you learn from the delay between your order and its effect?"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-slate-500">{reflection.length} characters</div>
              <div className="text-xs text-yellow-400">
                The more detail you write, the more you will learn from each round.
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-6">
          <h4 className="text-sm font-semibold text-white mb-3">Key Insights to Consider</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                <span className="font-semibold text-white">Cause & Effect:</span> How did your upstream decisions (ordering,
                production) create downstream outcomes (inventory, stockouts)?
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                <span className="font-semibold text-white">Trade-offs:</span> What did you sacrifice to achieve certain
                goals? (e.g., high inventory = high costs but low stockout risk)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                <span className="font-semibold text-white">System Behavior:</span> Did you observe any bottlenecks,
                accumulations, or unexpected system responses?
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={onContinue}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-xl hover:from-emerald-700 hover:to-sky-700 transition-all flex items-center justify-center gap-3 font-bold text-lg shadow-lg shadow-emerald-500/30 group"
          >
            Continue to Next Round
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all font-semibold">
            Save Draft
          </button>
        </div>

      </div>
    </div>
  );
}
