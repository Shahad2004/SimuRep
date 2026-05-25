import { useMemo } from 'react';
import { Route, Shirt } from 'lucide-react';
import type { LineBalancingTask } from '@/app/types/classes';
import {
  assignmentToStationLoads,
  buildStationPath,
  computeFlowMetrics,
  formatStationPath,
  industrialOptimalAssignment,
  type FlowMetrics,
} from './lineBalancingEngine';
import { LineBalancingFlowPanel } from './LineBalancingFlowPanel';

function FlowPathStrip({ metrics, label }: { metrics: FlowMetrics; label: string }) {
  const pathStr = formatStationPath(metrics.stationPath);
  const hasBack = metrics.backtrackingCount > 0;
  return (
    <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/50 p-3">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-xs font-mono break-all ${hasBack ? 'text-rose-200' : 'text-emerald-200'}`}>
        {pathStr}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
        <span className="text-emerald-300/90">Flow {metrics.flowEfficiencyPct}%</span>
        <span className="text-rose-300/90">Backtrack {metrics.backtrackingCount}</span>
        <span className="text-amber-300/90">Waste {metrics.transportationWaste}</span>
      </div>
    </div>
  );
}

function LayoutCard({
  title,
  subtitle,
  accent,
  stationIds,
  assignment,
  tasks,
  cycleTimeSec,
  flowMetrics,
}: {
  title: string;
  subtitle: string;
  accent: 'cyan' | 'amber' | 'emerald';
  stationIds: string[];
  assignment: Record<string, string[]>;
  tasks: LineBalancingTask[];
  cycleTimeSec: number;
  flowMetrics: FlowMetrics;
}) {
  const loads = useMemo(
    () => assignmentToStationLoads(stationIds, assignment, tasks),
    [stationIds, assignment, tasks],
  );
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const border =
    accent === 'cyan'
      ? 'border-cyan-500/35 bg-cyan-950/10'
      : accent === 'amber'
        ? 'border-amber-500/35 bg-amber-950/10'
        : 'border-emerald-500/35 bg-emerald-950/10';
  const titleColor =
    accent === 'cyan' ? 'text-cyan-200' : accent === 'amber' ? 'text-amber-200' : 'text-emerald-200';

  return (
    <div className={`rounded-xl border-2 ${border} p-4 flex flex-col`}>
      <div className={`text-sm font-bold ${titleColor}`}>{title}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>
      <div className="mt-3 space-y-2">
        {stationIds.map((stId, idx) => {
          const ids = assignment[stId] ?? [];
          const load = loads[idx] ?? 0;
          const overloaded = load > cycleTimeSec;
          return (
            <div
              key={stId}
              className={`rounded-lg border px-3 py-2 text-xs ${
                overloaded ? 'border-rose-500/40 bg-rose-950/20' : 'border-slate-700 bg-slate-950/40'
              }`}
            >
              <div className="flex justify-between font-semibold text-slate-200">
                <span>WS{idx + 1}</span>
                <span className={overloaded ? 'text-rose-300' : 'text-slate-400'}>{load}s</span>
              </div>
              <ul className="mt-1 text-[10px] text-slate-400 space-y-0.5">
                {ids.map((id) => (
                  <li key={id}>{taskById.get(id)?.label ?? id}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <FlowPathStrip metrics={flowMetrics} label="Shirt path" />
    </div>
  );
}

export function LineBalancingLevel2Summary({
  tasks,
  taskOrder,
  cycleTimeSec,
  level1StationIds,
  level1Assignment,
  level2StationIds,
  level2Assignment,
}: {
  tasks: LineBalancingTask[];
  taskOrder: string[];
  cycleTimeSec: number;
  level1StationIds: string[];
  level1Assignment: Record<string, string[]>;
  level2StationIds: string[];
  level2Assignment: Record<string, string[]>;
}) {
  const labelMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.label])), [tasks]);
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => taskOrder.indexOf(a.id) - taskOrder.indexOf(b.id)),
    [tasks, taskOrder],
  );

  const level1Flow = useMemo(() => {
    const path = buildStationPath(taskOrder, level1Assignment, level1StationIds);
    return computeFlowMetrics(taskOrder, labelMap, path);
  }, [taskOrder, level1Assignment, level1StationIds, labelMap]);

  const level2Flow = useMemo(() => {
    const path = buildStationPath(taskOrder, level2Assignment, level2StationIds);
    return computeFlowMetrics(taskOrder, labelMap, path);
  }, [taskOrder, level2Assignment, level2StationIds, labelMap]);

  const optimalStations = useMemo(
    () => industrialOptimalAssignment(sortedTasks, cycleTimeSec),
    [sortedTasks, cycleTimeSec],
  );

  const optimalStationIds = useMemo(() => optimalStations.map((s) => s.id), [optimalStations]);
  const optimalAssignment = useMemo(() => {
    const a: Record<string, string[]> = {};
    for (const st of optimalStations) a[st.id] = st.tasks.map((t) => t.id);
    return a;
  }, [optimalStations]);

  const optimalFlow = useMemo(() => {
    const path = buildStationPath(taskOrder, optimalAssignment, optimalStationIds);
    return computeFlowMetrics(taskOrder, labelMap, path);
  }, [taskOrder, optimalAssignment, optimalStationIds, labelMap]);

  const flowImproved =
    level2Flow.backtrackingCount < level1Flow.backtrackingCount ||
    level2Flow.flowEfficiencyPct > level1Flow.flowEfficiencyPct;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-amber-400" />
          Level 2 journey — balance + production flow
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Compare your Level 1 layout, your improved Level 2 line, and the industrial recommendation. A balanced line
          can still waste time if the shirt moves backward between stations.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <div className="text-[10px] text-slate-500">L1 → L2 flow efficiency</div>
          <div className="text-lg font-bold text-white tabular-nums">
            {level1Flow.flowEfficiencyPct}% → {level2Flow.flowEfficiencyPct}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <div className="text-[10px] text-slate-500">Backtracking</div>
          <div className="text-lg font-bold text-rose-300 tabular-nums">
            {level1Flow.backtrackingCount} → {level2Flow.backtrackingCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <div className="text-[10px] text-slate-500">Transport waste</div>
          <div className="text-lg font-bold text-amber-300 tabular-nums">
            {level1Flow.transportationWaste} → {level2Flow.transportationWaste}
          </div>
        </div>
        <div className={`rounded-xl border p-3 ${flowImproved ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-amber-500/30 bg-amber-950/20'}`}>
          <div className="text-[10px] text-slate-500">Lean takeaway</div>
          <div className={`text-xs font-semibold mt-1 ${flowImproved ? 'text-emerald-200' : 'text-amber-200'}`}>
            {flowImproved
              ? 'You improved production flow — keep forward movement in mind.'
              : 'Try grouping tasks so the shirt visits stations in order (WS1 → WS2 → WS3…).'}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <LayoutCard
          title="Level 1 — Original"
          subtitle="Before flow optimization"
          accent="cyan"
          stationIds={level1StationIds}
          assignment={level1Assignment}
          tasks={tasks}
          cycleTimeSec={cycleTimeSec}
          flowMetrics={level1Flow}
        />
        <LayoutCard
          title="Level 2 — Your improved line"
          subtitle="After rearranging for flow"
          accent="amber"
          stationIds={level2StationIds}
          assignment={level2Assignment}
          tasks={tasks}
          cycleTimeSec={cycleTimeSec}
          flowMetrics={level2Flow}
        />
        <LayoutCard
          title="Industrial recommendation"
          subtitle="Balanced loads + forward shirt path"
          accent="emerald"
          stationIds={optimalStationIds}
          assignment={optimalAssignment}
          tasks={tasks}
          cycleTimeSec={cycleTimeSec}
          flowMetrics={optimalFlow}
        />
      </div>

      <div className="rounded-xl border border-slate-600/80 bg-slate-950/30 p-4">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <Shirt className="w-4 h-4 text-cyan-400" />
          Replay your Level 2 workflow animation
        </div>
        <LineBalancingFlowPanel
          stationCount={level2StationIds.length}
          flowMetrics={level2Flow}
          stationIds={level2StationIds}
          assignment={level2Assignment}
          tasks={tasks}
          taskOrder={taskOrder}
          autoPlay={false}
        />
      </div>
    </div>
  );
}
