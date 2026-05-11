import { useState, useEffect } from 'react';
import { BarChart, MessageSquare, Play, RotateCcw, X, ClipboardList, Package, LogOut } from 'lucide-react';
import advisorAvatar from '@/assets/icons/Advisor.png';
import { motion, AnimatePresence } from 'motion/react';
import { LandscapeSupplyChain } from './LandscapeSupplyChain';
import { DecisionPanel } from './DecisionPanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { ReflectionPanel } from './ReflectionPanel';
import { DEFAULT_SCENARIO, getDirectedOrdering } from '@/app/types/scenario';

export interface RoundData {
  round: number;
  orderQty: number;
  productionRate: number;
  warehouseAPriority: number;
  warehouseBPriority: number;
  supplierInventory: number;
  factoryInventory: number;
  warehouseAInventory: number;
  warehouseBInventory: number;
  dcInventory: number;
  customerDemand: number;
  /** What the player saw (noisy); if missing, use customerDemand */
  displayedDemand?: number;
  stockouts: number;
  orderingCost: number;
  holdingCost: number;
  stockoutCost: number;
  totalCost: number;
  serviceLevel: number;
}

const LEAD_TIME = 2;
function clampOrder(v: number) {
  return Math.max(0, Math.min(200, v));
}
function demandNoise(scale: number) {
  return Math.round((Math.random() - 0.5) * 2 * scale);
}

const initialRoundData: RoundData[] = [
  {
    round: 1,
    orderQty: 100,
    productionRate: 90,
    warehouseAPriority: 60,
    warehouseBPriority: 40,
    supplierInventory: 150,
    factoryInventory: 80,
    warehouseAInventory: 45,
    warehouseBInventory: 35,
    dcInventory: 60,
    customerDemand: 100,
    stockouts: 0,
    orderingCost: 500,
    holdingCost: 320,
    stockoutCost: 0,
    totalCost: 820,
    serviceLevel: 100,
  },
  {
    round: 2,
    orderQty: 120,
    productionRate: 110,
    warehouseAPriority: 70,
    warehouseBPriority: 30,
    supplierInventory: 180,
    factoryInventory: 95,
    warehouseAInventory: 65,
    warehouseBInventory: 28,
    dcInventory: 72,
    customerDemand: 115,
    stockouts: 0,
    orderingCost: 600,
    holdingCost: 440,
    stockoutCost: 0,
    totalCost: 1040,
    serviceLevel: 100,
  },
  {
    round: 3,
    orderQty: 80,
    productionRate: 75,
    warehouseAPriority: 50,
    warehouseBPriority: 50,
    supplierInventory: 130,
    factoryInventory: 55,
    warehouseAInventory: 32,
    warehouseBInventory: 30,
    dcInventory: 48,
    customerDemand: 125,
    stockouts: 12,
    orderingCost: 400,
    holdingCost: 245,
    stockoutCost: 600,
    totalCost: 1245,
    serviceLevel: 90.4,
  },
  {
    round: 4,
    orderQty: 110,
    productionRate: 105,
    warehouseAPriority: 65,
    warehouseBPriority: 35,
    supplierInventory: 165,
    factoryInventory: 88,
    warehouseAInventory: 52,
    warehouseBInventory: 38,
    dcInventory: 65,
    customerDemand: 118,
    stockouts: 0,
    orderingCost: 550,
    holdingCost: 385,
    stockoutCost: 0,
    totalCost: 935,
    serviceLevel: 100,
  },
  {
    round: 5,
    orderQty: 105,
    productionRate: 100,
    warehouseAPriority: 60,
    warehouseBPriority: 40,
    supplierInventory: 160,
    factoryInventory: 85,
    warehouseAInventory: 48,
    warehouseBInventory: 36,
    dcInventory: 62,
    customerDemand: 112,
    stockouts: 0,
    orderingCost: 525,
    holdingCost: 365,
    stockoutCost: 0,
    totalCost: 890,
    serviceLevel: 100,
  },
];

type GameState = 'observe' | 'decisions' | 'analytics' | 'reflection' | 'executing';

interface ScenarioMetric {
  id: string;
  label: string;
  description: string;
}

interface ScenarioDefinition {
  title: string;
  context: string;
  objectives: string;
  analysisGuidance: string;
  keyMetrics?: ScenarioMetric[];
}

interface StudentClassConfig {
  id: string;
  name: string;
  templateId: string;
  createdAt: string;
  status: 'draft' | 'active';
  scenario: ScenarioDefinition;
}

const CLASSES_STORAGE_KEY = 'isbl_instructor_classes_v1';

export interface StudentDashboardProps {
  /** When set, use this as the only class (e.g. from dashboard after joining with PIN). */
  initialClass?: StudentClassConfig | null;
  /** When set, show Leave button (top right) to return to student dashboard. */
  onLeave?: () => void;
}

interface DecisionInputs {
  orderQty: number;
  productionRate: number;
  warehouseAPriority: number;
}

interface BullwhipContext {
  pipelineArrival: number;
  trueDemand: number;
  displayedDemand: number;
}

function calculateNextRound(
  base: RoundData,
  inputs: DecisionInputs,
  roundContext?: RoundContext,
): RoundData {
  const clampedOrder = clampOrder(inputs.orderQty ?? base.orderQty);
  const clampedProduction = Math.max(0, Math.min(150, inputs.productionRate || base.productionRate));
  const clampedWarehouseA = Math.max(0, Math.min(100, inputs.warehouseAPriority));
  const warehouseBPriority = 100 - clampedWarehouseA;

  const demand = bullwhip ? bullwhip.trueDemand : base.customerDemand;

  // Effective supply is driven by both order quantity and production rate.
  const supplyCapacity = Math.min(clampedOrder, clampedProduction);
  const imbalancePenalty = Math.abs(clampedWarehouseA - 50) / 50; // 0 (perfectly balanced) → 1 (extremely unbalanced)
  const effectiveSupply = supplyCapacity * (1 - imbalancePenalty * 0.3);
  const stockouts = Math.max(0, Math.round(demand - effectiveSupply));
  const fulfilledDemand = demand - stockouts;
  const serviceLevel = demand > 0 ? (fulfilledDemand / demand) * 100 : 100;

  // Simple inventory propagation through the system (not a full simulation but visibly responsive).
  const supplierInventory = Math.max(
    0,
    Math.round(base.supplierInventory + (clampedOrder - base.orderQty) * 0.5),
  );
  const factoryArrival = roundContext ? roundContext.pipelineArrival : 0;
  const factoryInventory = Math.max(
    0,
    Math.round(
      base.factoryInventory +
        factoryArrival +
        (clampedProduction - base.productionRate) * 0.4,
    ),
  );

  const totalToWarehouses = Math.min(clampedProduction, supplierInventory + clampedProduction);
  const targetWarehouseAInventory = totalToWarehouses * (clampedWarehouseA / 100);
  const targetWarehouseBInventory = totalToWarehouses * (warehouseBPriority / 100);

  const warehouseAInventory = Math.max(
    0,
    Math.round(base.warehouseAInventory + (targetWarehouseAInventory - base.warehouseAInventory) * 0.6),
  );
  const warehouseBInventory = Math.max(
    0,
    Math.round(base.warehouseBInventory + (targetWarehouseBInventory - base.warehouseBInventory) * 0.6),
  );

  const baseTotalInventory =
    base.supplierInventory +
    base.factoryInventory +
    base.warehouseAInventory +
    base.warehouseBInventory +
    base.dcInventory;

  const projectedTotalInventory =
    supplierInventory + factoryInventory + warehouseAInventory + warehouseBInventory + base.dcInventory;

  // Distribution center inventory reacts to how much is left after meeting demand.
  const dcInventory = Math.max(
    0,
    Math.round(
      base.dcInventory +
        (warehouseAInventory + warehouseBInventory - demand + fulfilledDemand) * 0.3,
    ),
  );

  // Costs respond to decisions and outcomes.
  const orderingCost = Math.round(base.orderingCost * (clampedOrder / base.orderQty));

  const holdingScale =
    baseTotalInventory > 0 ? projectedTotalInventory / baseTotalInventory : 1;
  const holdingCost = Math.round(base.holdingCost * holdingScale);

  const baseUnitStockoutPenalty =
    base.stockouts > 0 ? base.stockoutCost / base.stockouts : base.totalCost * 0.05;
  const stockoutCost = Math.round(stockouts * baseUnitStockoutPenalty);

  const totalCost = orderingCost + holdingCost + stockoutCost;

  const out: RoundData = {
    ...base,
    orderQty: clampedOrder,
    productionRate: clampedProduction,
    warehouseAPriority: clampedWarehouseA,
    warehouseBPriority,
    supplierInventory,
    factoryInventory,
    warehouseAInventory,
    warehouseBInventory,
    dcInventory,
    customerDemand: demand,
    stockouts,
    serviceLevel,
    orderingCost,
    holdingCost,
    stockoutCost,
    totalCost,
  };
  if (bullwhip) out.displayedDemand = bullwhip.displayedDemand;
  return out;
}

export function StudentDashboard({ initialClass = null, onLeave }: StudentDashboardProps = {}) {
  const [gameState, setGameState] = useState<GameState>('observe');
  const [currentRound, setCurrentRound] = useState(1);
  const [rounds, setRounds] = useState<RoundData[]>([initialRoundData[0]]);
  const [isExecuting, setIsExecuting] = useState(false);

  const [orderPipeline, setOrderPipeline] = useState<[number, number]>([100, 100]);
  const [orderQty, setOrderQty] = useState('100');
  const [productionRate, setProductionRate] = useState('90');
  const [warehouseAPriority, setWarehouseAPriority] = useState(60);

  const [availableClasses, setAvailableClasses] = useState<StudentClassConfig[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);

  useEffect(() => {
    if (initialClass) {
      setAvailableClasses([initialClass]);
      setSelectedClassId(initialClass.id);
      setShowBriefing(true);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(CLASSES_STORAGE_KEY);
      if (!raw) {
        setAvailableClasses([]);
        setShowBriefing(false);
        return;
      }
      const parsed = JSON.parse(raw) as StudentClassConfig[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setAvailableClasses([]);
        setShowBriefing(false);
        return;
      }
      setAvailableClasses(parsed);
      const active = parsed.find((c) => c.status === 'active') ?? parsed[0];
      setSelectedClassId(active.id);
      setShowBriefing(true);
    } catch {
      setAvailableClasses([]);
      setShowBriefing(false);
    }
  }, [initialClass]);

  const currentClass = availableClasses.find((c) => c.id === selectedClassId) ?? null;

  const currentData = rounds[rounds.length - 1];

  const handleExecuteDecision = () => {
    setGameState('executing');
    setIsExecuting(true);

    const parsedOrder = clampOrder(parseInt(orderQty, 10) || currentData.orderQty);
    const parsedProduction = parseInt(productionRate, 10) || currentData.productionRate;

    // Brief execution phase then apply round and show reflection immediately
    const EXECUTION_MS = 1200;
    const timer = setTimeout(() => {
      try {
        if (currentRound < initialRoundData.length) {
          const nextRound = currentRound + 1;
          const baseRound = initialRoundData[nextRound - 1];
          const pipelineArrival = orderPipeline[0];
          const baseDemand = baseRound.customerDemand;
          const orderDelta = Math.abs(parsedOrder - currentData.orderQty);
          const amplification = orderDelta * 0.04;
          const trueDemand = Math.max(5, baseDemand + demandNoise(12) + Math.round(amplification));
          const displayedDemand = Math.max(5, trueDemand + demandNoise(10));

          const nextRoundData = calculateNextRound(
            baseRound,
            {
              orderQty: parsedOrder,
              productionRate: isNaN(parsedProduction) ? baseRound.productionRate : parsedProduction,
              warehouseAPriority,
            },
            { pipelineArrival, trueDemand, displayedDemand },
          );

          setOrderPipeline([orderPipeline[1], parsedOrder]);
          setRounds((prev) => [...prev, nextRoundData]);
          setCurrentRound(nextRound);
          setIsExecuting(false);
          setGameState('reflection');
        } else {
          setIsExecuting(false);
          setGameState('observe');
        }
      } catch (e) {
        setIsExecuting(false);
        setGameState('reflection');
      }
    }, EXECUTION_MS);
    return () => clearTimeout(timer);
  };

  const handleContinueFromReflection = () => {
    setGameState('observe');
  };

  const handleReset = () => {
    setCurrentRound(1);
    setRounds([initialRoundData[0]]);
    setOrderPipeline([100, 100]);
    setGameState('observe');
    setOrderQty('100');
    setProductionRate('90');
    setWarehouseAPriority(60);
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-indigo-950/25 to-slate-950">
      {/* TOP BAR - ref: ROUND 1 prominent, scenario pill, Objective (yellow), Cost, dark buttons */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-700/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/95 rounded-xl px-5 py-2.5 border border-slate-600/50 shadow-lg">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Round</span>
                <div className="text-2xl font-bold text-white leading-tight">{currentRound}</div>
              </div>
              {currentClass && (
                <button
                  onClick={() => setShowBriefing(true)}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/90 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700/80"
                >
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  {currentClass.scenario?.title || currentClass.name}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="hidden md:block bg-slate-800/90 rounded-lg px-3 py-1.5 border border-slate-600/50">
                <span className="text-slate-500 text-[10px] uppercase">Objective:</span>{' '}
                <span className="text-amber-300 font-semibold text-sm">Maintain Supply Chain Stability</span>
              </div>
              <div className="bg-slate-800/90 rounded-lg px-4 py-2 border border-slate-600/50">
                <span className="text-slate-500 text-[10px] uppercase block">Cost</span>
                <span className="text-lg font-bold text-white">${currentData.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGameState(gameState === 'decisions' ? 'observe' : 'decisions')}
                  disabled={isExecuting || gameState === 'reflection'}
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
                  disabled={isExecuting || currentRound === 1}
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
                {onLeave && (
                  <button
                    onClick={onLeave}
                    className="ml-2 px-4 py-2 rounded-xl bg-amber-600/90 text-white hover:bg-amber-500 border border-amber-500/50 flex items-center gap-2 font-medium text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORE GAME VIEW - One wide horizontal flow (Supplier → Customer) */}
      <div
        className={`absolute inset-0 pt-20 pb-20 transition-all duration-500 flex flex-col ${
          gameState === 'decisions' || gameState === 'analytics' || gameState === 'reflection'
            ? 'blur-sm scale-95 brightness-50'
            : 'blur-0 scale-100 brightness-100'
        }`}
      >
        <LandscapeSupplyChain
          data={currentData}
          isExecuting={isExecuting}
          gameMode
          partialInfo
          displayedDemand={currentData.displayedDemand ?? currentData.customerDemand}
          orderPipeline={orderPipeline}
        />

        {/* Advisor speech bubble (ref: female advisor, red top, center-bottom) */}
        {gameState === 'observe' && !isExecuting && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 max-w-md"
          >
            <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl px-5 py-4 border border-slate-600/50 shadow-xl">
              <div className="flex items-start gap-3">
                <img
                  src={advisorAvatar}
                  alt="Advisor"
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-slate-500/50 shadow-lg"
                  title="Advisor"
                />
                <p className="text-sm text-slate-300 leading-relaxed pt-0.5">
                  It’s your turn. Order quantities are <span className="font-semibold text-amber-300">locked in for 2 turns</span>, so consider the long-term impact of each decision.
                </p>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-r border-b border-slate-600/50 rotate-45" />
            </div>
          </motion.div>
        )}
      </div>

      {/* BOTTOM BAR - ref: Orders (left), Next Turn teal (right) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-700/40">
        <button
          onClick={() => setGameState(gameState === 'decisions' ? 'observe' : 'decisions')}
          disabled={isExecuting || gameState === 'reflection'}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 text-white border border-slate-600/50 hover:bg-slate-700 font-medium text-sm disabled:opacity-50"
        >
          <Package className="w-5 h-5" />
          Orders
        </button>
        <button
          onClick={() => {
            if (gameState === 'decisions') handleExecuteDecision();
            else if (gameState === 'reflection') handleContinueFromReflection();
            else if (gameState === 'observe') setGameState('decisions');
          }}
          disabled={isExecuting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 text-slate-950 font-semibold text-sm shadow-lg shadow-teal-400/40 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gameState === 'decisions' ? 'Next Turn' : gameState === 'reflection' ? 'Continue' : 'Next Turn'}
        </button>
      </div>

      {/* DECISION PANEL - Slides from Left */}
      <AnimatePresence>
        {gameState === 'decisions' && (
          <motion.div
            initial={{ x: -500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -500, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-0 top-20 bottom-0 w-[420px] z-40"
          >
            <div className="h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 shadow-2xl flex flex-col min-h-0 overflow-hidden">
              <DecisionPanel
                currentRound={currentRound}
                orderQty={orderQty}
                setOrderQty={setOrderQty}
                productionRate={productionRate}
                setProductionRate={setProductionRate}
                warehouseAPriority={warehouseAPriority}
                setWarehouseAPriority={setWarehouseAPriority}
                onExecute={handleExecuteDecision}
                onClose={() => setGameState('observe')}
                isExecuting={isExecuting}
                maxRounds={initialRoundData.length}
                orderPipeline={orderPipeline}
                displayedDemand={currentData.displayedDemand ?? currentData.customerDemand}
                leadTimeOrder={LEAD_TIME}
                maxOrderQty={DEFAULT_SCENARIO.supplierMaxShip}
                maxProduction={DEFAULT_SCENARIO.factoryMaxProd}
                directedOrdering={getDirectedOrdering(
                  DEFAULT_SCENARIO,
                  {
                    round: currentRound,
                    invFactory: currentData.factoryInventory,
                    invWHA: currentData.warehouseAInventory,
                    invWHB: currentData.warehouseBInventory,
                    invDC: currentData.dcInventory,
                    pipeline: orderPipeline,
                    cumulativeCost: 0,
                    historyTrueDemand: [],
                    historyReportedDemand: rounds.slice(0, currentRound).map((r) => r.displayedDemand ?? r.customerDemand),
                  },
                  rounds.slice(0, currentRound).map((r) => r.displayedDemand ?? r.customerDemand),
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANALYTICS PANEL - Slides from Right */}
      <AnimatePresence>
        {gameState === 'analytics' && (
          <motion.div
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-20 bottom-0 w-[480px] z-40"
          >
            <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl overflow-y-auto">
              <AnalyticsPanel rounds={rounds} currentRound={currentRound} onClose={() => setGameState('observe')} gameMode />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REFLECTION PANEL - Centered Modal */}
      <AnimatePresence>
        {gameState === 'reflection' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 flex justify-center p-4 sm:p-8 overflow-y-auto bg-slate-950/85 backdrop-blur-sm"
          >
            <div className="w-full max-w-4xl my-6">
              <ReflectionPanel
                currentRound={currentRound}
                currentData={currentData}
                rounds={rounds}
                orderPipeline={orderPipeline}
                onContinue={handleContinueFromReflection}
                onClose={() => setGameState('observe')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executing State Overlay */}
      {isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-sm px-8 py-6 rounded-2xl border border-blue-500/50 shadow-2xl shadow-blue-500/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">Executing decision</div>
                <div className="text-sm text-slate-400">Running the round —You’ll Running the round — opening reflection next.</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scenario briefing overlay (only when a class is defined) */}
      <AnimatePresence>
        {currentClass && showBriefing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Scenario briefing
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {currentClass.scenario.title || currentClass.name}
                  </h2>
                  <p className="text-[11px] text-sky-100/90">
                    Class: <span className="font-semibold">{currentClass.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowBriefing(false)}
                  className="w-8 h-8 rounded-full bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-center text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {currentClass.scenario.context && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                      Industrial context
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {currentClass.scenario.context}
                    </p>
                  </div>
                )}

                {currentClass.scenario.objectives && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                      Your mission (1‑2‑3)
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-slate-200 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
                      {currentClass.scenario.objectives}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentClass.scenario.analysisGuidance && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                        Using the analysis tab
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {currentClass.scenario.analysisGuidance}
                      </p>
                    </div>
                  )}

                  {currentClass.scenario.keyMetrics && currentClass.scenario.keyMetrics.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                        Metrics to watch
                      </div>
                      <div className="space-y-2 text-xs text-slate-200">
                        {currentClass.scenario.keyMetrics.map((m) => (
                          <div
                            key={m.id}
                            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2"
                          >
                            <div className="font-semibold text-sky-300 mb-0.5">{m.label}</div>
                            <p className="text-[11px] text-slate-300">{m.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    Progress: Round {currentRound} of {initialRoundData.length}. Aim to improve your
                    metrics round by round.
                  </div>
                  <button
                    onClick={() => setShowBriefing(false)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-400/40"
                  >
                    Start simulation
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
