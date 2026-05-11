import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Package, Factory, Warehouse, Building2, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import type { RoundData } from './StudentDashboard';

interface SupplyChainVisualizationProps {
  data: RoundData;
  isExecuting: boolean;
  gameMode?: boolean;
  /** Hide exact numbers for non-player nodes */
  partialInfo?: boolean;
  /** What the player saw as demand (noisy) */
  displayedDemand?: number;
}

type ExecutionStage = 'idle' | 'ordering' | 'producing' | 'distributing' | 'delivering';

const BOX_EMOJI = '📦';

function approx(v: number, step = 5) {
  return Math.round(v / step) * step;
}

interface StationProps {
  icon: any;
  emoji: string;
  label: string;
  inventory: number;
  maxInventory: number;
  status: 'stable' | 'warning' | 'critical';
  isExecuting: boolean;
  delay?: number;
  position: 'top' | 'middle' | 'bottom';
  isActive?: boolean;
  /** Show ~value (partial info) */
  approximate?: boolean;
}

function Station({
  icon: Icon,
  emoji,
  label,
  inventory,
  maxInventory,
  status,
  isExecuting,
  delay = 0,
  position,
  isActive = false,
  approximate = false,
}: StationProps) {
  const displayInv = approximate ? approx(inventory) : inventory;
  const percentage = Math.min((inventory / maxInventory) * 100, 100);

  const statusColors = {
    stable: {
      gradient: 'from-emerald-400 via-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-400/50',
      glow: 'shadow-emerald-400/30',
      border: 'border-emerald-400',
      bar: 'bg-emerald-400',
    },
    warning: {
      gradient: 'from-amber-400 via-amber-500 to-orange-500',
      shadow: 'shadow-amber-400/50',
      glow: 'shadow-amber-400/30',
      border: 'border-amber-400',
      bar: 'bg-amber-400',
    },
    critical: {
      gradient: 'from-rose-500 via-red-500 to-orange-600',
      shadow: 'shadow-rose-500/50',
      glow: 'shadow-rose-500/30',
      border: 'border-rose-400',
      bar: 'bg-rose-500',
    },
  };

  const colors = statusColors[status];
  const activeRing = isActive && isExecuting ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950' : '';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring' }}
      className="relative group"
    >
      {/* Status Glow Effect */}
      {status !== 'stable' && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`absolute inset-0 rounded-xl blur-xl ${colors.glow}`}
        />
      )}

      <div className={`relative bg-slate-800/90 backdrop-blur-sm rounded-xl border-2 ${colors.border} p-4 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-3xl w-44 ${activeRing}`}>
        {/* Status Badge */}
        <div className="absolute -top-2 -right-2 z-10">
          <motion.div
            animate={status === 'critical' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-7 h-7 rounded-full bg-gradient-to-br ${colors.gradient} ${colors.shadow} flex items-center justify-center`}
          >
            {status === 'stable' ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-white" />
            )}
          </motion.div>
        </div>

        {/* Emoji + Icon container */}
        <div className="relative mb-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: [0, -3, 3, 0] }}
            transition={{ duration: 0.4 }}
            className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${colors.gradient} ${colors.shadow} flex items-center justify-center text-4xl`}
          >
            {emoji}
          </motion.div>

          {/* Activity Indicator */}
          {isExecuting && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute -top-1 -right-1"
            >
              <Zap className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
            </motion.div>
          )}
        </div>

        {/* Label */}
        <div className="text-center mb-3">
          <div className="font-bold text-white text-sm">{label}</div>
        </div>

        {/* Inventory Display */}
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-400">Inventory</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">
                {approximate ? '~' : ''}{displayInv}
              </span>
              <span className="text-xs text-slate-500">/{maxInventory}</span>
            </div>
          </div>
          
          {/* Inventory Bar */}
          <div className="relative w-full h-3 bg-slate-800 rounded-md overflow-hidden border border-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, delay: delay + 0.3, type: 'spring' }}
              className={`h-full ${colors.bar} relative`}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>

          <div className="mt-1.5 text-xs text-center">
            <span className={`font-semibold ${status === 'stable' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Executing Pulse Effect */}
        {isExecuting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-blue-400 rounded-xl"
          />
        )}
      </div>
    </motion.div>
  );
}

function FlowArrow({
  isExecuting,
  delay = 0,
  vertical = false,
  label,
  active = false,
}: {
  isExecuting: boolean;
  delay?: number;
  vertical?: boolean;
  label?: string;
  active?: boolean;
}) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative">
          <svg width="20" height="80" viewBox="0 0 20 80" className="overflow-visible">
            <motion.line
              x1="10"
              y1="0"
              x2="10"
              y2="70"
              stroke="url(#gradientVertical)"
              strokeWidth={active && isExecuting ? 6 : 4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay }}
            />
            <motion.polygon
              points="5,70 15,70 10,80"
              fill="url(#gradientVertical)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
            />
            <defs>
              <linearGradient id="gradientVertical" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

        {isExecuting && active && (
            <>
              {[0, 0.7, 1.4].map((d) => (
                <motion.div
                  key={d}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 90, opacity: [0, 1, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, delay: delay + d }}
                  className="absolute left-1/2 -translate-x-1/2 text-xl drop-shadow-lg"
                >
                  {BOX_EMOJI}
                </motion.div>
              ))}
            </>
          )}
        </div>
        {label && (
          <div className="mt-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-semibold text-blue-400">
            {label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6">
      {label && (
        <div className="mb-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-semibold text-purple-400">
          {label}
        </div>
      )}
      <div className="relative">
        <svg width="80" height="20" viewBox="0 0 80 20" className="overflow-visible">
          <motion.line
            x1="0"
            y1="10"
            x2="70"
            y2="10"
            stroke="url(#gradient)"
            strokeWidth={active && isExecuting ? 6 : 4}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay }}
          />
          <motion.polygon
            points="70,5 80,10 70,15"
            fill="url(#gradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {isExecuting && active && (
          <>
            {[0, 0.6, 1.2].map((d) => (
              <motion.div
                key={d}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 90, opacity: [0, 1, 1, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, delay: delay + d }}
                className="absolute top-1/2 -translate-y-1/2 text-2xl drop-shadow-lg"
              >
                {BOX_EMOJI}
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function SupplyChainVisualization({
  data,
  isExecuting,
  gameMode,
  partialInfo = false,
  displayedDemand,
}: SupplyChainVisualizationProps) {
  const [stage, setStage] = useState<ExecutionStage>('idle');

  useEffect(() => {
    if (!isExecuting) {
      setStage('idle');
      return;
    }

    setStage('ordering');
    const timeouts = [
      setTimeout(() => setStage('producing'), 700),
      setTimeout(() => setStage('distributing'), 1400),
      setTimeout(() => setStage('delivering'), 2100),
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isExecuting]);

  const stageLabel =
    stage === 'ordering'
      ? 'Orders are being released into the system.'
      : stage === 'producing'
      ? 'Factory is producing and building inventory.'
      : stage === 'distributing'
      ? 'Inventory is flowing into the regional warehouses.'
      : stage === 'delivering'
      ? 'Shipments are moving from DC to customers.'
      : 'Waiting for your next decision.';

  const getStatus = (inventory: number, threshold: number): 'stable' | 'warning' | 'critical' => {
    const ratio = inventory / threshold;
    if (ratio > 0.5) return 'stable';
    if (ratio > 0.25) return 'warning';
    return 'critical';
  };

  const supplierStatus = getStatus(data.supplierInventory, 200);
  const factoryStatus = getStatus(data.factoryInventory, 120);
  const warehouseAStatus = getStatus(data.warehouseAInventory, 80);
  const warehouseBStatus = getStatus(data.warehouseBInventory, 80);
  const dcStatus = getStatus(data.dcInventory, 100);

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center justify-start py-4 relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{ 
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.18) 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }} />
      </div>

      {gameMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 z-10"
        >
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-6 py-3 shadow-xl">
            <div className="text-sm text-slate-300 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span>
                🔄 Live Supply Chain •{' '}
                <span className="text-sky-400 font-semibold">Round {data.round}</span>
              </span>
              <span className="text-xs text-slate-400">{stageLabel}</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative z-10 space-y-4 w-full max-w-6xl px-4">
        {/* Row 1: Supplier → Factory */}
        <div className="flex items-center justify-center gap-6">
          <Station
            icon={Package}
            emoji="📦"
            label="Supplier"
            inventory={data.supplierInventory}
            maxInventory={200}
            status={supplierStatus}
            isExecuting={isExecuting}
            delay={0}
            position="top"
            isActive={stage === 'ordering'}
            approximate={partialInfo}
          />
          <FlowArrow
            isExecuting={isExecuting}
            delay={0.2}
            label="📤 Order Flow"
            active={stage === 'ordering' || stage === 'producing'}
          />
          <Station
            icon={Factory}
            emoji="🏭"
            label="Factory"
            inventory={data.factoryInventory}
            maxInventory={120}
            status={factoryStatus}
            isExecuting={isExecuting}
            delay={0.4}
            position="top"
            isActive={stage === 'producing'}
          />
        </div>

        {/* Row 2: Factory → Warehouses */}
        <div className="relative flex items-start justify-center gap-16">
          {/* Warehouse A Branch */}
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <div className="px-3 py-1.5 bg-blue-600/30 border-2 border-blue-400 rounded-lg text-blue-300 font-bold text-xs shadow-lg shadow-blue-500/20">
                {data.warehouseAPriority}% Priority
              </div>
            </div>
            <FlowArrow
              isExecuting={isExecuting}
              delay={0.6}
              vertical
              active={stage === 'distributing'}
            />
            <div className="mt-2">
              <Station
                icon={Warehouse}
                emoji="🏪"
                label="Warehouse A"
                inventory={data.warehouseAInventory}
                maxInventory={80}
                status={warehouseAStatus}
                isExecuting={isExecuting}
                delay={0.8}
                position="middle"
                isActive={stage === 'distributing'}
                approximate={partialInfo}
              />
            </div>
          </div>

          {/* Warehouse B Branch */}
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <div className="px-3 py-1.5 bg-purple-600/30 border-2 border-purple-400 rounded-lg text-purple-300 font-bold text-xs shadow-lg shadow-purple-500/20">
                {data.warehouseBPriority}% Priority
              </div>
            </div>
            <FlowArrow
              isExecuting={isExecuting}
              delay={0.6}
              vertical
              active={stage === 'distributing'}
            />
            <div className="mt-2">
              <Station
                icon={Warehouse}
                emoji="🏪"
                label="Warehouse B"
                inventory={data.warehouseBInventory}
                maxInventory={80}
                status={warehouseBStatus}
                isExecuting={isExecuting}
                delay={0.8}
                position="middle"
                isActive={stage === 'distributing'}
                approximate={partialInfo}
              />
            </div>
          </div>

          {/* Connecting Curved Lines */}
          <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 pointer-events-none" style={{ zIndex: -1 }}>
            <defs>
              <linearGradient id="branchGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="branchGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 400 0 Q 300 40, 200 70"
              stroke="url(#branchGradient1)"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            />
            <motion.path
              d="M 400 0 Q 500 40, 600 70"
              stroke="url(#branchGradient2)"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            />
          </svg>
        </div>

        {/* Row 3: Warehouses → Distribution Center */}
        <div className="flex items-center justify-center gap-4">
          <div className="w-40" />
          <FlowArrow
            isExecuting={isExecuting}
            delay={1.0}
            label="📥 Consolidation"
            active={stage === 'distributing'}
          />
          <Station
            icon={Building2}
            emoji="🏢"
            label="Distribution Center"
            inventory={data.dcInventory}
            maxInventory={100}
            status={dcStatus}
            isExecuting={isExecuting}
            delay={1.2}
            position="middle"
            isActive={stage === 'distributing' || stage === 'delivering'}
            approximate={partialInfo}
          />
          <FlowArrow
            isExecuting={isExecuting}
            delay={1.4}
            label="🚚 Delivery"
            active={stage === 'delivering'}
          />
          <div className="w-40" />
        </div>

        {/* Row 4: Customer */}
        <div className="flex items-center justify-center pb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="relative"
          >
            {data.stockouts > 0 && (
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-xl blur-xl shadow-red-500/50"
              />
            )}
            <div className={`bg-slate-800/90 backdrop-blur-sm rounded-xl border-2 ${data.stockouts > 0 ? 'border-red-400' : 'border-blue-400'} p-6 shadow-2xl w-72`}>
              <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-lg shadow-blue-500/50 flex items-center justify-center text-5xl">
                👥
              </div>
              <div className="text-center mb-3">
                <div className="font-bold text-white text-base">Customer</div>
                <div className="text-xs text-slate-400 mt-1">End of Supply Chain</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {partialInfo && displayedDemand != null ? 'Reported demand' : 'Demand'}
                  </span>
                  <span className="text-xl font-bold text-blue-400">
                    {partialInfo && displayedDemand != null ? `~${displayedDemand}` : data.customerDemand}
                  </span>
                </div>
                {data.stockouts > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-red-500/20 border-2 border-red-500 rounded-lg p-2"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="text-xs font-bold text-red-400">Stockout Alert!</div>
                        <div className="text-xs text-red-300">Unfulfilled: {data.stockouts}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {data.stockouts === 0 && (
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="text-xs font-semibold text-green-400">Demand Met</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      {gameMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-4 mb-4 z-10"
        >
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-6 py-3 shadow-xl">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-slate-300">Stable (&gt;50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-slate-300">Warning (25-50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <span className="text-slate-300">Critical (&lt;25%)</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}