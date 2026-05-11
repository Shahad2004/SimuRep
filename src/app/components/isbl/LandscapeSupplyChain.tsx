import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { RoundData } from './StudentDashboard';

const BOX_EMOJI = '📦';

interface LandscapeSupplyChainProps {
  data: RoundData;
  isExecuting: boolean;
  gameMode?: boolean;
  partialInfo?: boolean;
  displayedDemand?: number;
  /** Orders in transit: [arrives next round, arrives in 2 rounds] */
  orderPipeline?: [number, number];
}

const NODES = [
  { key: 'supplier', emoji: '📦', label: 'Supplier', inv: (d: RoundData) => d.supplierInventory, max: 200 },
  { key: 'factory', emoji: '🏭', label: 'Factory', inv: (d: RoundData) => d.factoryInventory, max: 120, isPlayer: true },
  { key: 'wha', emoji: '🏠', label: 'WH A', inv: (d: RoundData) => d.warehouseAInventory, max: 80 },
  { key: 'whb', emoji: '🏠', label: 'WH B', inv: (d: RoundData) => d.warehouseBInventory, max: 80 },
  { key: 'dc', emoji: '🏢', label: 'Distrib. Center', inv: (d: RoundData) => d.dcInventory, max: 100 },
  { key: 'customer', emoji: '👥', label: 'Customer', inv: () => 0, max: 1, isCustomer: true },
] as const;

function approx(v: number, step = 5) {
  return Math.round(v / step) * step;
}

type FlowState = 'smooth' | 'congested' | 'gap';

/** Glowing dashed pathway; shows 📦 transfer during execute, or looping boxes when idle */
function FlowLane({
  flowAmount,
  state,
  isActive,
  isLastSegment,
  demandUnmet,
  segmentIndex,
  transferPhase,
  isExecuting,
}: {
  flowAmount: number;
  state: FlowState;
  isActive: boolean;
  isLastSegment?: boolean;
  demandUnmet?: boolean;
  segmentIndex?: number;
  transferPhase?: number;
  isExecuting?: boolean;
}) {
  const count = Math.min(8, Math.max(0, Math.round(flowAmount / 18)));
  const duration = state === 'congested' ? 8 : state === 'gap' ? 3 : 5;
  const isEmpty = state === 'gap' && count === 0;
  const useRedWavy = isLastSegment && demandUnmet;
  const isTransferSegment = isExecuting && segmentIndex !== undefined && transferPhase === segmentIndex;

  const baseStyles = 'flex-1 min-w-[72px] h-20 flex items-center relative overflow-hidden rounded-lg border-2';
  const dashedBorder = 'border-dashed';
  const glowStyles = useRedWavy
    ? 'border-red-400 bg-red-500/20 shadow-[0_0_24px_rgba(248,113,113,0.4)]'
    : state === 'congested'
    ? 'border-amber-400/60 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
    : state === 'gap'
    ? 'border-red-400/50 bg-red-500/10 shadow-[0_0_16px_rgba(248,113,113,0.2)]'
    : 'border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_22px_rgba(52,211,153,0.3)]';

  return (
    <div
      className={`${baseStyles} ${dashedBorder} ${glowStyles} ${
        useRedWavy ? 'animate-pulse' : ''
      } ${isActive ? 'shadow-[0_0_28px_rgba(56,189,248,0.4)] ring-2 ring-cyan-400/70' : ''} ${isExecuting && !isTransferSegment ? 'opacity-60' : ''}`}
      style={useRedWavy ? { boxShadow: '0 0 28px rgba(248,113,113,0.35), inset 0 0 20px rgba(248,113,113,0.08)' } : undefined}
    >
      {useRedWavy && !isExecuting && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-90" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="redWavyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path d="M 0 50 Q 20 25, 40 50 T 80 50 T 100 50" fill="none" stroke="url(#redWavyGrad)" strokeWidth="8" strokeLinecap="round" />
        </svg>
      )}
      {/* During execute: one-shot transfer of 📦 on the active segment only */}
      {isTransferSegment && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute flex items-center justify-center"
              style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}
              initial={{ left: 0 }}
              animate={{ left: '100%' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: 'linear' }}
            >
              <span className="text-2xl drop-shadow-md" role="img" aria-label="box">{BOX_EMOJI}</span>
            </motion.div>
          ))}
        </>
      )}
      {/* Boxes move only during Execute (after you take a decision); no idle looping */}
      {isEmpty && !useRedWavy && !isExecuting && (
        <span className="text-red-400/90 text-xs font-semibold w-full text-center drop-shadow-sm">gap</span>
      )}
    </div>
  );
}

/** Building-style node: dark base, inner glow, bright label; warning triangle when issues */
function LandscapeNode({
  emoji,
  label,
  inventory,
  maxInventory,
  isPlayer,
  isCustomer,
  approximate,
  stockouts,
  displayedDemand,
  customerDemand,
  partialInfo,
}: {
  emoji: string;
  label: string;
  inventory: number;
  maxInventory: number;
  isPlayer?: boolean;
  isCustomer?: boolean;
  approximate?: boolean;
  stockouts?: number;
  displayedDemand?: number;
  customerDemand?: number;
  partialInfo?: boolean;
}) {
  const ratio = maxInventory > 0 ? inventory / maxInventory : 0;
  const status: 'stable' | 'warning' | 'critical' =
    ratio > 0.5 ? 'stable' : ratio > 0.25 ? 'warning' : 'critical';
  const displayInv = approximate ? approx(inventory) : inventory;
  const showWarning = !isCustomer && (status === 'warning' || status === 'critical');
  const customerTrouble = isCustomer && stockouts != null && stockouts > 0;

  const glow =
    status === 'stable'
      ? 'border-emerald-400/70 shadow-[0_0_18px_rgba(52,211,153,0.2)]'
      : status === 'warning'
      ? 'border-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]'
      : 'border-red-400/70 shadow-[0_0_18px_rgba(248,113,113,0.2)]';

  return (
    <div className="flex-shrink-0 relative">
      {/* Warning triangle above building (ref style) */}
      {showWarning && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
          <AlertTriangle className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        </div>
      )}
      {isCustomer && customerTrouble && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
          <AlertTriangle className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
        </div>
      )}

      <div
        className={`flex-shrink-0 w-44 rounded-xl border-2 bg-slate-900/95 backdrop-blur-sm p-4 ${glow} ${
          isPlayer ? 'ring-2 ring-cyan-400/50' : ''
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-slate-700/80" />
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl drop-shadow-md">{emoji}</span>
          <span className="text-sm font-bold text-emerald-300 truncate drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
            {label}
          </span>
        </div>
        {!isCustomer ? (
          <>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500">Inv</span>
              <span className="text-slate-200 font-semibold">{approximate ? '~' : ''}{displayInv}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                className={`h-full rounded-full ${
                  status === 'stable' ? 'bg-emerald-400' : status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ratio * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{partialInfo ? 'Demand ~' : 'Demand'}</span>
              <span className={stockouts != null && stockouts > 0 ? 'text-red-400 font-semibold' : 'text-cyan-300 font-semibold'}>
                {partialInfo && displayedDemand != null ? `~${displayedDemand}` : customerDemand ?? 0}
                {stockouts != null && stockouts > 0 && <span className="ml-1" title="Unmet">😞</span>}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                className={`h-full rounded-full ${
                  stockouts != null && stockouts > 0 ? 'bg-red-500' : 'bg-emerald-400'
                }`}
                initial={{ width: 0 }}
                animate={{
                  width: stockouts != null && stockouts > 0
                    ? `${Math.min(100, ((customerDemand ?? 0) - (stockouts ?? 0)) / Math.max(1, customerDemand ?? 1) * 100)}%`
                    : '100%',
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {stockouts != null && stockouts > 0 ? (
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                <span className="opacity-80">💔</span>
                Demand Unmet
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Met
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Segments (5): S→F, F→WHA, WHA→WHB, WHB→DC, DC→C */
function getSegmentFlow(
  data: RoundData,
  index: number,
  orderPipeline: [number, number],
): { amount: number; state: FlowState } {
  const [p0, p1] = orderPipeline;
  const pipelineTotal = p0 + p1;
  const getState = (inv: number, max: number): FlowState =>
    max <= 0 ? 'smooth' : inv / max > 0.8 ? 'congested' : inv / max < 0.2 ? 'gap' : 'smooth';

  switch (index) {
    case 0:
      return { amount: pipelineTotal, state: getState(data.factoryInventory, 120) };
    case 1:
      return {
        amount: (data.productionRate * data.warehouseAPriority) / 100,
        state: getState(data.warehouseAInventory, 80),
      };
    case 2:
      return {
        amount: data.warehouseAInventory * 0.4 + data.warehouseBInventory * 0.4,
        state: getState(data.warehouseBInventory, 80),
      };
    case 3:
      return {
        amount: data.warehouseBInventory * 0.5 + data.warehouseAInventory * 0.3 + 15,
        state: getState(data.dcInventory, 100),
      };
    case 4:
      return {
        amount: Math.min(data.dcInventory, data.customerDemand) || data.customerDemand,
        state: data.stockouts > 0 ? 'gap' : 'smooth',
      };
    default:
      return { amount: 50, state: 'smooth' };
  }
}

export function LandscapeSupplyChain({
  data,
  isExecuting,
  gameMode,
  partialInfo = false,
  displayedDemand,
  orderPipeline = [100, 100],
}: LandscapeSupplyChainProps) {
  const [transferPhase, setTransferPhase] = useState(0);
  const TRANSFER_PHASE_MS = 500;

  useEffect(() => {
    if (!isExecuting) {
      setTransferPhase(0);
      return;
    }
    const t = setInterval(() => {
      setTransferPhase((p) => Math.min(p + 1, 4));
    }, TRANSFER_PHASE_MS);
    return () => clearInterval(t);
  }, [isExecuting]);

  const segments = [
    getSegmentFlow(data, 0, orderPipeline),
    getSegmentFlow(data, 1, orderPipeline),
    getSegmentFlow(data, 2, orderPipeline),
    getSegmentFlow(data, 3, orderPipeline),
    getSegmentFlow(data, 4, orderPipeline),
  ];

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <div className="absolute left-[15%] bottom-8 w-2 h-2 rounded-full bg-emerald-400/40 blur-sm" />
        <div className="absolute left-[45%] bottom-6 w-1.5 h-1.5 rounded-full bg-cyan-400/30 blur-sm" />
        <div className="absolute right-[30%] bottom-10 w-2 h-2 rounded-full bg-amber-400/30 blur-sm" />
      </div>
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[1400px] mx-auto px-4">
        <div className="flex items-stretch gap-0 min-h-[200px] py-8 items-center relative z-10 justify-center" style={{ minWidth: 'min(100%, 1200px)' }}>
          {NODES.map((node, i) => (
            <div key={node.key} className="flex items-center gap-0 flex-shrink-0">
              <LandscapeNode
                emoji={node.emoji}
                label={node.label}
                inventory={node.inv(data)}
                maxInventory={node.max}
                isPlayer={node.isPlayer}
                isCustomer={node.isCustomer}
                approximate={partialInfo && !node.isPlayer && !node.isCustomer}
                stockouts={node.isCustomer ? data.stockouts : undefined}
                displayedDemand={displayedDemand}
                customerDemand={data.customerDemand}
                partialInfo={partialInfo}
              />
              {i < NODES.length - 1 && (
                <FlowLane
                  flowAmount={segments[i].amount}
                  state={segments[i].state}
                  isActive={isExecuting && transferPhase === i}
                  isLastSegment={i === NODES.length - 2}
                  demandUnmet={data.stockouts > 0}
                  segmentIndex={i}
                  transferPhase={transferPhase}
                  isExecuting={isExecuting}
                />
              )}
            </div>
          ))}
        </div>
        {gameMode && (
          <div className="flex-shrink-0 px-4 pb-2 text-center">
            <div className="text-[10px] text-slate-500 max-w-xl mx-auto">
              Green = smooth flow. Amber = congestion. Red = gaps. Orders lock in for 2 turns.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
