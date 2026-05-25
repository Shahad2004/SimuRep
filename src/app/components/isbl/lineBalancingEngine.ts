import type { LineBalancingTask } from '@/app/types/classes';

export type OptimalStation = {
  id: string;
  tasks: LineBalancingTask[];
  loadSec: number;
};

export type FeedbackInsight = {
  id: string;
  label: string;
  detail: string;
  tone: 'good' | 'warn' | 'bad';
};

export type LineBalanceAnalysis = {
  insights: FeedbackInsight[];
  loadVariance: number;
  nearEmptyStations: number[];
  overloadedStations: number[];
  balanceScore: number;
};

export type FlowMetrics = {
  stationPath: number[];
  taskLabels: string[];
  backtrackingCount: number;
  totalTransfers: number;
  transportationWaste: number;
  flowEfficiencyPct: number;
  segments: Array<{ from: number; to: number; backward: boolean }>;
};

const NEAR_EMPTY_RATIO = 0.25;
const NEAR_EMPTY_ABSOLUTE_SEC = 12;

export function calcMinStations(totalProcessingTime: number, cycleTime: number) {
  const t = Number.isFinite(totalProcessingTime) ? totalProcessingTime : 0;
  const c = Number.isFinite(cycleTime) && cycleTime > 0 ? cycleTime : 1;
  return Math.ceil(t / c);
}

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

/** Score lower = better industrial solution */
function scoreIndustrialSolution(
  stations: OptimalStation[],
  cycleTimeSec: number,
  minStations: number,
): number {
  if (stations.length === 0) return Infinity;
  const loads = stations.map((s) => s.loadSec);
  const avg = sum(loads) / loads.length;
  const variance =
    loads.reduce((acc, l) => acc + (l - avg) ** 2, 0) / Math.max(1, loads.length);
  const idle = stations.length * cycleTimeSec - sum(loads);
  let nearEmptyPenalty = 0;
  for (const load of loads) {
    if (load < NEAR_EMPTY_ABSOLUTE_SEC || load < cycleTimeSec * NEAR_EMPTY_RATIO) {
      nearEmptyPenalty += cycleTimeSec - load;
    }
  }
  const extraStations = Math.max(0, stations.length - minStations);
  return (
    variance * 2 +
    idle * 0.35 +
    nearEmptyPenalty * 1.5 +
    extraStations * cycleTimeSec * 0.8
  );
}

type Partition = LineBalancingTask[][];

/** Split ordered tasks into contiguous groups (respects precedence), each group sum ≤ cycle time */
function partitionContiguous(
  ordered: LineBalancingTask[],
  stationCount: number,
  cycleTimeSec: number,
): Partition | null {
  const n = ordered.length;
  if (stationCount < 1 || stationCount > n) return null;

  const memo = new Map<string, Partition | null>();

  function dfs(start: number, stationsLeft: number): Partition | null {
    if (start === n) return stationsLeft === 0 ? [] : null;
    if (stationsLeft === 0) return null;
    const key = `${start}:${stationsLeft}`;
    if (memo.has(key)) return memo.get(key)!;

    let best: Partition | null = null;
    let load = 0;
    const group: LineBalancingTask[] = [];

    for (let i = start; i < n; i++) {
      const t = ordered[i];
      if (load + t.timeSec > cycleTimeSec) break;
      group.push(t);
      load += t.timeSec;
      const rest = dfs(i + 1, stationsLeft - 1);
      if (rest) {
        const candidate = [group, ...rest];
        if (!best || scorePartition(candidate) < scorePartition(best)) {
          best = candidate;
        }
      }
    }

    memo.set(key, best);
    return best;
  }

  function scorePartition(parts: Partition): number {
    const loads = parts.map((g) => sum(g.map((t) => t.timeSec)));
    const avg = sum(loads) / loads.length;
    return loads.reduce((acc, l) => acc + Math.abs(l - avg), 0);
  }

  return dfs(0, stationCount);
}

function partitionToStations(parts: Partition): OptimalStation[] {
  return parts.map((tasks, idx) => ({
    id: `opt_${idx + 1}`,
    tasks,
    loadSec: sum(tasks.map((t) => t.timeSec)),
  }));
}

function isNearEmptyLoad(loadSec: number, cycleTimeSec: number): boolean {
  return loadSec > 0 && (loadSec < NEAR_EMPTY_ABSOLUTE_SEC || loadSec < cycleTimeSec * NEAR_EMPTY_RATIO);
}

/** Merge trailing/leading near-empty adjacent stations when combined load still fits cycle time */
function consolidateNearEmptyStations(
  stations: OptimalStation[],
  cycleTimeSec: number,
): OptimalStation[] {
  if (stations.length <= 1) return stations;

  let merged = stations.map((s) => ({
    id: s.id,
    tasks: [...s.tasks],
    loadSec: s.loadSec,
  }));

  let changed = true;
  while (changed) {
    changed = false;
    const next: OptimalStation[] = [];
    for (const st of merged) {
      const last = next[next.length - 1];
      const nearEmpty = isNearEmptyLoad(st.loadSec, cycleTimeSec);
      if (
        last &&
        nearEmpty &&
        last.loadSec + st.loadSec <= cycleTimeSec
      ) {
        last.tasks.push(...st.tasks);
        last.loadSec += st.loadSec;
        changed = true;
      } else {
        next.push({ id: st.id, tasks: [...st.tasks], loadSec: st.loadSec });
      }
    }
    merged = next;
  }

  return merged.map((s, idx) => ({
    ...s,
    id: `opt_${idx + 1}`,
    loadSec: sum(s.tasks.map((t) => t.timeSec)),
  }));
}

export function formatStationPath(path: number[]): string {
  return path.map((n) => `WS${n}`).join(' → ');
}

/** Educational bullets comparing a student layout to the industrial recommendation */
export function insightsComparedToIndustrial(
  playerLoads: number[],
  optimalLoads: number[],
  cycleTimeSec: number,
  playerStationCount: number,
  optimalStationCount: number,
): FeedbackInsight[] {
  const insights: FeedbackInsight[] = [];
  const playerNear = playerLoads
    .map((l, i) => (isNearEmptyLoad(l, cycleTimeSec) ? i + 1 : 0))
    .filter((n) => n > 0);
  const optimalNear = optimalLoads
    .map((l, i) => (isNearEmptyLoad(l, cycleTimeSec) ? i + 1 : 0))
    .filter((n) => n > 0);

  if (playerNear.length > 0 && optimalNear.length === 0) {
    insights.push({
      id: 'vs_opt_empty',
      label: 'Nearly-empty stations vs recommended',
      detail: `Your layout has underused station${playerNear.length > 1 ? 's' : ''} ${playerNear.join(', ')}. The industrial layout fills stations more evenly — valid math is not the same as a good line.`,
      tone: 'bad',
    });
  }

  if (playerStationCount > optimalStationCount) {
    insights.push({
      id: 'vs_opt_count',
      label: 'More workstations than recommended',
      detail: `You used ${playerStationCount} stations; a typical industrial layout uses ${optimalStationCount}. Extra stations often add idle time and walking without improving throughput.`,
      tone: 'warn',
    });
  }

  const playerAvg = playerLoads.length ? sum(playerLoads) / playerLoads.length : 0;
  const optimalAvg = optimalLoads.length ? sum(optimalLoads) / optimalLoads.length : 0;
  const playerSpread =
    playerLoads.length > 0
      ? Math.max(...playerLoads) - Math.min(...playerLoads.filter((l) => l > 0), 0)
      : 0;
  const optimalSpread =
    optimalLoads.length > 0
      ? Math.max(...optimalLoads) - Math.min(...optimalLoads.filter((l) => l > 0), 0)
      : 0;

  if (playerSpread > optimalSpread + cycleTimeSec * 0.15) {
    insights.push({
      id: 'vs_opt_balance',
      label: 'Workload less even than recommended',
      detail: `Your station loads are spread wider than the industrial recommendation. Balanced + efficient beats “fits in cycle time” alone.`,
      tone: 'warn',
    });
  } else if (
    playerStationCount === optimalStationCount &&
    Math.abs(playerAvg - optimalAvg) < cycleTimeSec * 0.12 &&
    playerNear.length === 0
  ) {
    insights.push({
      id: 'vs_opt_strong',
      label: 'Close to industrial recommendation',
      detail: 'Your station count and load distribution are similar to what an industrial engineer would recommend for this scenario.',
      tone: 'good',
    });
  }

  return insights;
}

/**
 * Industrial optimal: precedence-respecting contiguous assignment,
 * minimizes idle/near-empty stations and load imbalance (not LCR).
 */
export function industrialOptimalAssignment(
  orderedTasks: LineBalancingTask[],
  cycleTimeSec: number,
): OptimalStation[] {
  const ordered = [...orderedTasks].sort(
    (a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0),
  );
  const totalTime = sum(ordered.map((t) => t.timeSec));
  const minN = calcMinStations(totalTime, cycleTimeSec);

  let best: OptimalStation[] | null = null;
  let bestScore = Infinity;

  const maxN = Math.min(ordered.length, minN + 3);
  for (let n = minN; n <= maxN; n++) {
    const parts = partitionContiguous(ordered, n, cycleTimeSec);
    if (!parts) continue;
    let stations = partitionToStations(parts);
    stations = consolidateNearEmptyStations(stations, cycleTimeSec);
    const score = scoreIndustrialSolution(stations, cycleTimeSec, minN);
    if (score < bestScore) {
      bestScore = score;
      best = stations;
    }
  }

  if (best) return best;

  // Fallback: one task per station if partition fails
  return ordered.map((t, idx) => ({
    id: `opt_${idx + 1}`,
    tasks: [t],
    loadSec: t.timeSec,
  }));
}

export function analyzeStudentLine(
  stationLoads: number[],
  cycleTimeSec: number,
  efficiency: number,
  idleTimeSec: number,
  minStations: number,
  stationsUsed: number,
  anyOverloaded: boolean,
): LineBalanceAnalysis {
  const insights: FeedbackInsight[] = [];
  const overloadedStations: number[] = [];
  const nearEmptyStations: number[] = [];

  if (anyOverloaded) {
    stationLoads.forEach((load, idx) => {
      if (load > cycleTimeSec) overloadedStations.push(idx + 1);
    });
    insights.push({
      id: 'overload',
      label: 'Overloaded station(s)',
      detail: `Station${overloadedStations.length > 1 ? 's' : ''} ${overloadedStations.join(', ')} exceed the ${cycleTimeSec}s cycle time. Work cannot finish before the next unit arrives — this creates a bottleneck.`,
      tone: 'bad',
    });
  } else {
    insights.push({
      id: 'no_overload',
      label: 'No overloaded stations',
      detail: 'Every station stays within cycle time, so the line can run without forced waiting at a single bottleneck.',
      tone: 'good',
    });
  }

  stationLoads.forEach((load, idx) => {
    if (load > 0 && (load < NEAR_EMPTY_ABSOLUTE_SEC || load < cycleTimeSec * NEAR_EMPTY_RATIO)) {
      nearEmptyStations.push(idx + 1);
    }
  });

  if (nearEmptyStations.length > 0) {
    insights.push({
      id: 'underutilized',
      label: `Station${nearEmptyStations.length > 1 ? 's' : ''} underutilized`,
      detail: `Station${nearEmptyStations.length > 1 ? 's' : ''} ${nearEmptyStations.join(', ')} hold very little work compared to the ${cycleTimeSec}s cycle time. In industry, nearly-empty stations waste capital and create uneven workload.`,
      tone: 'bad',
    });
  }

  const avg = stationLoads.length ? sum(stationLoads) / stationLoads.length : 0;
  const loadVariance =
    stationLoads.length > 0
      ? stationLoads.reduce((acc, l) => acc + (l - avg) ** 2, 0) / stationLoads.length
      : 0;
  const maxLoad = Math.max(...stationLoads, 0);
  const minLoad = Math.min(...stationLoads.filter((l) => l > 0), maxLoad);
  const spread = maxLoad - minLoad;

  if (stationLoads.length >= 2 && spread > cycleTimeSec * 0.35) {
    insights.push({
      id: 'uneven',
      label: 'Workload distribution is uneven',
      detail: `Loads range from ${minLoad}s to ${maxLoad}s. Balanced lines keep station times close so no worker waits while another struggles.`,
      tone: 'warn',
    });
  } else if (stationLoads.length >= 2 && !anyOverloaded) {
    insights.push({
      id: 'even',
      label: 'Good workload balance',
      detail: 'Station loads are relatively even, which is what industrial engineers aim for after balancing.',
      tone: 'good',
    });
  }

  const idleRatio = stationsUsed > 0 ? idleTimeSec / (stationsUsed * cycleTimeSec) : 0;
  if (idleRatio > 0.35) {
    insights.push({
      id: 'high_idle',
      label: 'Idle time is high',
      detail: `${idleTimeSec}s of unused capacity across stations. Fewer, fuller stations (without overload) usually improve efficiency.`,
      tone: 'warn',
    });
  } else if (idleRatio <= 0.2 && !anyOverloaded) {
    insights.push({
      id: 'low_idle',
      label: 'Efficient use of station time',
      detail: 'Idle time is relatively low — your line uses most of the available cycle time productively.',
      tone: 'good',
    });
  }

  const effPct = Math.round(efficiency * 100);
  if (effPct >= 85 && !anyOverloaded) {
    insights.push({
      id: 'efficiency',
      label: 'Good balancing efficiency',
      detail: `${effPct}% line efficiency means most station capacity goes to actual work, not waiting.`,
      tone: 'good',
    });
  } else if (effPct < 70) {
    insights.push({
      id: 'low_eff',
      label: 'Balancing efficiency can improve',
      detail: `At ${effPct}% efficiency, too much capacity is idle. Try merging underused stations or redistributing tasks.`,
      tone: 'warn',
    });
  }

  if (stationsUsed > minStations + 1) {
    insights.push({
      id: 'too_many_stations',
      label: 'More stations than necessary',
      detail: `Theoretical minimum is ${minStations} stations; you used ${stationsUsed}. Extra stations often add idle time and cost without improving throughput.`,
      tone: 'warn',
    });
  }

  const balanceScore = Math.max(
    0,
    100 -
      (anyOverloaded ? 35 : 0) -
      nearEmptyStations.length * 12 -
      Math.min(25, spread * 0.4) -
      Math.min(20, idleRatio * 40),
  );

  return {
    insights,
    loadVariance,
    nearEmptyStations,
    overloadedStations,
    balanceScore: Math.round(balanceScore),
  };
}

/** Map task id → 1-based station index (layout order) */
export function buildStationPath(
  taskOrder: string[],
  assignment: Record<string, string[]>,
  stationIds: string[],
): number[] {
  const indexByStation = new Map(stationIds.map((id, i) => [id, i + 1]));
  return taskOrder.map((taskId) => {
    for (const stId of stationIds) {
      if ((assignment[stId] ?? []).includes(taskId)) {
        return indexByStation.get(stId) ?? 1;
      }
    }
    return 1;
  });
}

export function computeFlowMetrics(
  taskOrder: string[],
  taskLabels: Map<string, string>,
  stationPath: number[],
): FlowMetrics {
  const labels = taskOrder.map((id) => taskLabels.get(id) ?? id);
  const segments: FlowMetrics['segments'] = [];
  let backtrackingCount = 0;
  let transportationWaste = 0;

  for (let i = 1; i < stationPath.length; i++) {
    const from = stationPath[i - 1];
    const to = stationPath[i];
    const backward = to < from;
    if (backward) {
      backtrackingCount += 1;
      transportationWaste += from - to;
    }
    segments.push({ from, to, backward });
  }

  const totalTransfers = Math.max(0, stationPath.length - 1);
  const forwardTransfers = segments.filter((s) => !s.backward).length;
  const flowEfficiencyPct =
    totalTransfers > 0 ? Math.round((forwardTransfers / totalTransfers) * 100) : 100;

  return {
    stationPath,
    taskLabels: labels,
    backtrackingCount,
    totalTransfers,
    transportationWaste,
    flowEfficiencyPct,
    segments,
  };
}

/** Flow-optimal uses same contiguous partition (forward-only station indices) */
export function industrialFlowOptimalAssignment(
  orderedTasks: LineBalancingTask[],
  cycleTimeSec: number,
): OptimalStation[] {
  return industrialOptimalAssignment(orderedTasks, cycleTimeSec);
}

export function assignmentToStationLoads(
  stationIds: string[],
  assignment: Record<string, string[]>,
  tasks: LineBalancingTask[],
): number[] {
  return stationIds.map((id) => {
    const ids = assignment[id] ?? [];
    return sum(ids.map((tid) => tasks.find((t) => t.id === tid)?.timeSec ?? 0));
  });
}
