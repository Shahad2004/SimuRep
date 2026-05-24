import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Factory, Route, Shirt, XCircle } from 'lucide-react';
import type { LineBalancingTask } from '@/app/types/classes';
import {
  assignmentToStationLoads,
  buildStationPath,
  calcMinStations,
  computeFlowMetrics,
  industrialOptimalAssignment,
  type FlowMetrics,
  type OptimalStation,
} from './lineBalancingEngine';

import { getWorkstationImageForTaskGroup } from './workstationAssets';

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0);
}

function optimalToLayout(optimal: OptimalStation[]) {
  const stationIds = optimal.map((s) => s.id);
  const assignment: Record<string, string[]> = {};
  for (const st of optimal) assignment[st.id] = st.tasks.map((t) => t.id);
  return { stationIds, assignment };
}

function MetricPill({
  label,
  yours,
  optimal,
  betterWhenLower,
  suffix = '',
}: {
  label: string;
  yours: number;
  optimal: number;
  betterWhenLower?: boolean;
  suffix?: string;
}) {
  const youWin =
    yours === optimal
      ? null
      : betterWhenLower
        ? yours < optimal
        : yours > optimal;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2 text-sm">
        <div>
          <div className="text-[10px] text-cyan-400/80">You</div>
          <div className={`font-bold tabular-nums ${youWin === true ? 'text-emerald-300' : youWin === false ? 'text-amber-200' : 'text-white'}`}>
            {yours}
            {suffix}
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 mb-1" />
        <div className="text-right">
          <div className="text-[10px] text-emerald-400/80">Industrial</div>
          <div className="font-bold tabular-nums text-emerald-200">
            {optimal}
            {suffix}
          </div>
        </div>
      </div>
      {youWin != null && (
        <div className={`mt-2 text-[10px] flex items-center gap-1 ${youWin ? 'text-emerald-400' : 'text-amber-400'}`}>
          {youWin ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {youWin ? 'Matches or beats recommended' : 'Room to improve vs recommended'}
        </div>
      )}
    </div>
  );
}

function StationColumn({
  title,
  variant,
  stationIds,
  assignment,
  tasks,
  cycleTimeSec,
  loads,
}: {
  title: string;
  variant: 'player' | 'optimal';
  stationIds: string[];
  assignment: Record<string, string[]>;
  tasks: LineBalancingTask[];
  cycleTimeSec: number;
  loads: number[];
}) {
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const border =
    variant === 'player' ? 'border-cyan-500/35 bg-cyan-950/10' : 'border-emerald-500/35 bg-emerald-950/10';
  const titleColor = variant === 'player' ? 'text-cyan-200' : 'text-emerald-200';

  return (
    <div className={`rounded-xl border-2 ${border} p-4`}>
      <div className={`text-sm font-bold ${titleColor} flex items-center gap-2`}>
        {variant === 'player' ? <Shirt className="w-4 h-4" /> : <Factory className="w-4 h-4" />}
        {title}
      </div>
      <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {stationIds.map((stId, idx) => {
          const load = loads[idx] ?? 0;
          const overloaded = load > cycleTimeSec;
          const taskIds = assignment[stId] ?? [];
          const primaryGroup = taskById.get(taskIds[0] ?? '')?.group;
          const pct = Math.min(100, Math.round((load / cycleTimeSec) * 100));
          return (
            <div key={stId} className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-2.5">
              <div className="flex items-center gap-2">
                <img
                  src={getWorkstationImageForTaskGroup(primaryGroup)}
                  alt=""
                  className="w-10 h-10 object-contain shrink-0"
                  draggable={false}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">WS {idx + 1}</div>
                  <div className={`text-[10px] tabular-nums ${overloaded ? 'text-rose-300' : 'text-slate-400'}`}>
                    {load}s / {cycleTimeSec}s
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${overloaded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
              <ul className="mt-2 space-y-0.5">
                {taskIds.map((tid) => {
                  const t = taskById.get(tid);
                  if (!t) return null;
                  return (
                    <li key={tid} className="text-[10px] text-slate-300 truncate">
                      • {t.label} <span className="text-slate-500">({t.timeSec}s)</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowPathStrip({ metrics, label }: { metrics: FlowMetrics; label: string }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/40 p-2">
      <div className="text-[10px] text-slate-500 mb-1">{label}</div>
      <div className="flex flex-wrap items-center gap-0.5">
        {metrics.stationPath.map((st, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-600">
              WS{st}
            </span>
            {i < metrics.stationPath.length - 1 && (
              <ArrowRight
                className={`w-3 h-3 ${metrics.segments[i]?.backward ? 'text-rose-400' : 'text-emerald-400'}`}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineBalancingSolutionComparison({
  tasks,
  taskOrder,
  cycleTimeSec,
  playerStationIds,
  playerAssignment,
  showFlow = false,
  title,
}: {
  tasks: LineBalancingTask[];
  taskOrder: string[];
  cycleTimeSec: number;
  playerStationIds: string[];
  playerAssignment: Record<string, string[]>;
  showFlow?: boolean;
  title?: string;
}) {
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => taskOrder.indexOf(a.id) - taskOrder.indexOf(b.id)),
    [tasks, taskOrder],
  );

  const optimalStations = useMemo(
    () => industrialOptimalAssignment(sortedTasks, cycleTimeSec),
    [sortedTasks, cycleTimeSec],
  );

  const { stationIds: optimalStationIds, assignment: optimalAssignment } = useMemo(
    () => optimalToLayout(optimalStations),
    [optimalStations],
  );

  const playerLoads = useMemo(
    () => assignmentToStationLoads(playerStationIds, playerAssignment, tasks),
    [playerStationIds, playerAssignment, tasks],
  );

  const optimalLoads = useMemo(
    () => optimalStations.map((s) => s.loadSec),
    [optimalStations],
  );

  const totalProc = sum(tasks.map((t) => t.timeSec));
  const minStations = calcMinStations(totalProc, cycleTimeSec);

  const playerEfficiency =
    playerStationIds.length > 0 ? totalProc / (playerStationIds.length * cycleTimeSec) : 0;
  const optimalEfficiency =
    optimalStationIds.length > 0 ? totalProc / (optimalStationIds.length * cycleTimeSec) : 0;

  const playerIdle = Math.max(0, playerStationIds.length * cycleTimeSec - totalProc);
  const optimalIdle = Math.max(0, optimalStationIds.length * cycleTimeSec - totalProc);

  const labelMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.label])), [tasks]);

  const playerFlow = useMemo(() => {
    const path = buildStationPath(taskOrder, playerAssignment, playerStationIds);
    return computeFlowMetrics(taskOrder, labelMap, path);
  }, [taskOrder, playerAssignment, playerStationIds, labelMap]);

  const optimalFlow = useMemo(() => {
    const path = buildStationPath(taskOrder, optimalAssignment, optimalStationIds);
    return computeFlowMetrics(taskOrder, labelMap, path);
  }, [taskOrder, optimalAssignment, optimalStationIds, labelMap]);

  return (
    <div className="rounded-xl border border-slate-600/80 bg-slate-950/30 p-4 space-y-4">
      <div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-amber-400" />
          {title ?? 'Your solution vs industrial recommendation'}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Side-by-side layout from industrial engineering: contiguous task groups, balanced loads, forward shirt flow.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricPill
          label="Stations used"
          yours={playerStationIds.length}
          optimal={optimalStationIds.length}
          betterWhenLower
        />
        <MetricPill
          label="Line efficiency"
          yours={Math.round(playerEfficiency * 100)}
          optimal={Math.round(optimalEfficiency * 100)}
          suffix="%"
        />
        <MetricPill
          label="Idle time"
          yours={Math.round(playerIdle)}
          optimal={Math.round(optimalIdle)}
          betterWhenLower
          suffix="s"
        />
        <MetricPill
          label="Min stations (theory)"
          yours={minStations}
          optimal={minStations}
        />
      </div>

      {showFlow && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricPill
            label="Flow efficiency"
            yours={playerFlow.flowEfficiencyPct}
            optimal={optimalFlow.flowEfficiencyPct}
            suffix="%"
          />
          <MetricPill
            label="Backtracking"
            yours={playerFlow.backtrackingCount}
            optimal={optimalFlow.backtrackingCount}
            betterWhenLower
          />
          <MetricPill
            label="Transport waste"
            yours={playerFlow.transportationWaste}
            optimal={optimalFlow.transportationWaste}
            betterWhenLower
          />
          <MetricPill
            label="Transfers"
            yours={playerFlow.totalTransfers}
            optimal={optimalFlow.totalTransfers}
            betterWhenLower
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <StationColumn
            title="Your line layout"
            variant="player"
            stationIds={playerStationIds}
            assignment={playerAssignment}
            tasks={tasks}
            cycleTimeSec={cycleTimeSec}
            loads={playerLoads}
          />
          {showFlow && <FlowPathStrip metrics={playerFlow} label="Your shirt path" />}
        </div>
        <div>
          <StationColumn
            title="Recommended industrial layout"
            variant="optimal"
            stationIds={optimalStationIds}
            assignment={optimalAssignment}
            tasks={tasks}
            cycleTimeSec={cycleTimeSec}
            loads={optimalLoads}
          />
          {showFlow && <FlowPathStrip metrics={optimalFlow} label="Recommended shirt path (forward only)" />}
        </div>
      </div>
    </div>
  );
}
