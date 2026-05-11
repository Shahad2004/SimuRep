import { Play, X } from 'lucide-react';

export interface DirectedOrderingInfo {
  forecast: number;
  leadTimeDemand: number;
  safetyStock: number;
  S: number;
  inventoryPosition: number;
  recommendedOrder: number;
}

interface DecisionPanelProps {
  currentRound: number;
  orderQty: string;
  setOrderQty: (value: string) => void;
  productionRate: string;
  setProductionRate: (value: string) => void;
  warehouseAPriority: number;
  setWarehouseAPriority: (value: number) => void;
  onExecute: () => void;
  onClose: () => void;
  isExecuting: boolean;
  maxRounds: number;
  orderPipeline?: number[];
  displayedDemand?: number;
  /** Lead time in rounds (order placed now arrives after this many rounds) */
  leadTimeOrder?: number;
  /** Optional base-stock recommendation from scenario */
  directedOrdering?: DirectedOrderingInfo;
  /** Max order quantity for dropdown options */
  maxOrderQty?: number;
  maxProduction?: number;
}

const ORDER_OPTIONS = [0, 25, 50, 75, 100, 125, 150, 175, 200];

export function DecisionPanel({
  currentRound,
  orderQty,
  setOrderQty,
  productionRate,
  setProductionRate,
  warehouseAPriority,
  setWarehouseAPriority,
  onExecute,
  onClose,
  isExecuting,
  maxRounds,
  orderPipeline = [0, 0],
  displayedDemand,
  leadTimeOrder = 2,
  directedOrdering,
  maxOrderQty = 200,
  maxProduction = 150,
}: DecisionPanelProps) {
  const warehouseBPriority = 100 - warehouseAPriority;
  const orderNum = parseInt(orderQty, 10) || 0;
  const isCustomOrder = orderQty !== '' && !ORDER_OPTIONS.includes(orderNum);
  const orderOptions = [...ORDER_OPTIONS].filter((n) => n <= maxOrderQty);
  if (orderNum >= 0 && !orderOptions.includes(orderNum)) orderOptions.push(orderNum);
  orderOptions.sort((a, b) => a - b);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Fixed header */}
      <div className="shrink-0 flex items-center justify-between p-4 pb-2">
        <h2 className="text-lg font-bold text-white">Decide</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable content — everything else so you can always reach inputs and Execute */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4">
        <p className="text-xs text-slate-400 mb-3">Round {currentRound} of {maxRounds}. Orders take {leadTimeOrder} rounds to arrive.</p>

        {/* In transit — one line */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-400">In transit:</span>
          {orderPipeline.map((qty, i) => (
            <span key={i} className="bg-amber-500/15 text-amber-200 px-2 py-0.5 rounded text-xs">
              in {i + 1} round{i + 1 !== 1 ? 's' : ''}: {qty}
            </span>
          ))}
        </div>

        {/* Demand — one line */}
        {displayedDemand != null && (
          <div className="mb-3 text-sm">
            <span className="text-slate-400">Demand this round: </span>
            <span className="font-semibold text-sky-200">~{displayedDemand} units</span>
          </div>
        )}

        {/* Recommendation — one line when available */}
        {directedOrdering && (
          <div className="mb-3 text-sm">
            <span className="text-slate-400">Suggested order: </span>
            <span className="font-semibold text-emerald-300">{directedOrdering.recommendedOrder} units</span>
          </div>
        )}

        {/* ——— Your 3 decisions ——— */}
        <div className="space-y-3 mt-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Order quantity</label>
            <div className="flex gap-2">
              <select
                value={isCustomOrder ? 'custom' : orderQty}
                onChange={(e) => { const v = e.target.value; if (v === 'custom') setOrderQty(orderQty || '0'); else setOrderQty(v); }}
                disabled={isExecuting}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {orderOptions.map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
                <option value="custom">Other</option>
              </select>
              {isCustomOrder && (
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  disabled={isExecuting}
                  className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max={maxOrderQty}
                />
              )}
              <span className="text-slate-500 text-sm self-center">units</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Production (units)</label>
            <input
              type="number"
              value={productionRate}
              onChange={(e) => setProductionRate(e.target.value)}
              disabled={isExecuting}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
              min="0"
              max={maxProduction}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Split: Warehouse A <span className="text-blue-400 font-semibold">{warehouseAPriority}%</span> · B {warehouseBPriority}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={warehouseAPriority}
              onChange={(e) => setWarehouseAPriority(parseInt(e.target.value))}
              disabled={isExecuting}
              className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Execute — inside scroll so it's always reachable */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={onExecute}
            disabled={isExecuting || currentRound >= maxRounds}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {isExecuting ? 'Running...' : currentRound >= maxRounds ? 'Done' : 'Run round'}
          </button>
          {currentRound >= maxRounds && (
            <p className="text-center text-xs text-slate-400 mt-2">All rounds done</p>
          )}
        </div>
      </div>
    </div>
  );
}
