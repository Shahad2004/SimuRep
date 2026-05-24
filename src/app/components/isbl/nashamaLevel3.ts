import type { LineBalancingTask } from '@/app/types/classes';
import {
  analyzeStudentLine,
  buildStationPath,
  calcMinStations,
  computeFlowMetrics,
  industrialFlowOptimalAssignment,
  type FlowMetrics,
  type OptimalStation,
} from './lineBalancingEngine';

export const NASHAMA_CYCLE_TIME_SEC = 55;
export const NASHAMA_WORKSTATION_COST = 100;

export const NASHAMA_TASK_SEQUENCE: string[] = [
  'n3_fabric',
  'n3_cut_front',
  'n3_cut_back',
  'n3_cut_sleeves',
  'n3_print_logo',
  'n3_print_number',
  'n3_badge',
  'n3_sew_shoulders',
  'n3_sew_sleeves',
  'n3_sew_sides',
  'n3_collar',
  'n3_inspect',
  'n3_trim_threads',
  'n3_iron',
  'n3_fold',
  'n3_sticker',
  'n3_fan_pack',
  'n3_ship_box',
];

export const NASHAMA_TASKS: LineBalancingTask[] = [
  { id: 'n3_fabric', label: 'Receive blue fabric rolls', timeSec: 6, group: 'Cutting', sequenceOrder: 1 },
  { id: 'n3_cut_front', label: 'Cut front shirt panel', timeSec: 10, group: 'Cutting', sequenceOrder: 2 },
  { id: 'n3_cut_back', label: 'Cut back shirt panel', timeSec: 9, group: 'Cutting', sequenceOrder: 3 },
  { id: 'n3_cut_sleeves', label: 'Cut sleeves', timeSec: 8, group: 'Cutting', sequenceOrder: 4 },
  { id: 'n3_print_logo', label: 'Print Jordan logo', timeSec: 14, group: 'Printing', sequenceOrder: 5 },
  { id: 'n3_print_number', label: 'Print player number', timeSec: 12, group: 'Printing', sequenceOrder: 6 },
  { id: 'n3_badge', label: 'Attach Jordan badge', timeSec: 11, group: 'Assembly', sequenceOrder: 7 },
  { id: 'n3_sew_shoulders', label: 'Sew shoulders', timeSec: 13, group: 'Sewing', sequenceOrder: 8 },
  { id: 'n3_sew_sleeves', label: 'Sew sleeves', timeSec: 17, group: 'Sewing', sequenceOrder: 9 },
  { id: 'n3_sew_sides', label: 'Sew side seams', timeSec: 15, group: 'Sewing', sequenceOrder: 10 },
  { id: 'n3_collar', label: 'Attach collar', timeSec: 14, group: 'Sewing', sequenceOrder: 11 },
  { id: 'n3_inspect', label: 'Quality inspection', timeSec: 10, group: 'Quality', sequenceOrder: 12 },
  { id: 'n3_trim_threads', label: 'Remove loose threads', timeSec: 7, group: 'Quality', sequenceOrder: 13 },
  { id: 'n3_iron', label: 'Iron shirt', timeSec: 11, group: 'Finishing', sequenceOrder: 14 },
  { id: 'n3_fold', label: 'Fold shirt', timeSec: 6, group: 'Finishing', sequenceOrder: 15 },
  { id: 'n3_sticker', label: 'Add packaging sticker', timeSec: 5, group: 'Packing', sequenceOrder: 16 },
  { id: 'n3_fan_pack', label: 'Place shirt in fan packaging', timeSec: 8, group: 'Packing', sequenceOrder: 17 },
  { id: 'n3_ship_box', label: 'Prepare shipping box', timeSec: 6, group: 'Packing', sequenceOrder: 18 },
];

export const NASHAMA_TOTAL_PROCESSING_SEC = NASHAMA_TASKS.reduce((a, t) => a + t.timeSec, 0);
export const NASHAMA_MIN_STATIONS = calcMinStations(NASHAMA_TOTAL_PROCESSING_SEC, NASHAMA_CYCLE_TIME_SEC);

export type NashamaRank =
  | 'Factory Trainee'
  | 'Nashama Line Coordinator'
  | 'Production Supervisor'
  | 'Lean Manufacturing Specialist'
  | 'Nashama Industrial Engineering Expert';

export type NashamaLeaderboardEntry = {
  id: string;
  playerName: string;
  totalScore: number;
  balanceEfficiencyPct: number;
  flowEfficiencyPct: number;
  wasteReductionPct: number;
  completionSeconds: number;
  rank: NashamaRank;
  submittedAt: string;
  labId?: string;
};

export type NashamaScoreBreakdown = {
  totalScore: number;
  balanceEfficiency: number;
  flowEfficiency: number;
  idleTimeReduction: number;
  wasteReduction: number;
  workstationScore: number;
  speedScore: number;
  rank: NashamaRank;
};

const LEADERBOARD_KEY = 'nashama_worldcup_leaderboard_v1';

/** Educational precedence rules shown in Level 3 UI */
export const NASHAMA_PRECEDENCE_RULES = [
  'Fabric cutting must happen before sewing',
  'Logo printing must happen before final assembly',
  'Sleeves must be sewn before attaching collar',
  'Inspection must happen before packaging',
  'Ironing must happen before folding',
  'Packaging is the final stage',
] as const;

export const NASHAMA_RANKS: NashamaRank[] = [
  'Factory Trainee',
  'Nashama Line Coordinator',
  'Production Supervisor',
  'Lean Manufacturing Specialist',
  'Nashama Industrial Engineering Expert',
];

export function calcWorkloadBalancePct(stationLoads: number[], cycleTimeSec: number): number {
  const active = stationLoads.filter((l) => l > 0);
  if (active.length < 2) return active.length === 1 ? 100 : 0;
  const max = Math.max(...active);
  const min = Math.min(...active);
  const spread = max - min;
  return Math.round(Math.max(0, 100 - (spread / cycleTimeSec) * 100));
}

export function getLeaderboardPosition(
  entries: NashamaLeaderboardEntry[],
  entryId: string,
): number {
  const idx = entries.findIndex((e) => e.id === entryId);
  return idx >= 0 ? idx + 1 : entries.length + 1;
}

export function getNashamaPrerequisiteIds(taskId: string): string[] {
  const idx = NASHAMA_TASK_SEQUENCE.indexOf(taskId);
  if (idx <= 0) return [];
  return NASHAMA_TASK_SEQUENCE.slice(0, idx);
}

export function getNashamaDependentIds(taskId: string): string[] {
  const idx = NASHAMA_TASK_SEQUENCE.indexOf(taskId);
  if (idx < 0 || idx >= NASHAMA_TASK_SEQUENCE.length - 1) return [];
  return NASHAMA_TASK_SEQUENCE.slice(idx + 1);
}

export function sortNashamaTasks(taskList: LineBalancingTask[]) {
  return [...taskList].sort(
    (a, b) => NASHAMA_TASK_SEQUENCE.indexOf(a.id) - NASHAMA_TASK_SEQUENCE.indexOf(b.id),
  );
}

export function computeNashamaFlow(
  assignment: Record<string, string[]>,
  stationIds: string[],
): FlowMetrics {
  const path = buildStationPath(NASHAMA_TASK_SEQUENCE, assignment, stationIds);
  const labelMap = new Map(NASHAMA_TASKS.map((t) => [t.id, t.label]));
  return computeFlowMetrics(NASHAMA_TASK_SEQUENCE, labelMap, path);
}

export function getNashamaOptimal(): OptimalStation[] {
  return industrialFlowOptimalAssignment(NASHAMA_TASKS, NASHAMA_CYCLE_TIME_SEC);
}

export function scoreToRank(totalScore: number): NashamaRank {
  if (totalScore >= 85) return 'Nashama Industrial Engineering Expert';
  if (totalScore >= 70) return 'Lean Manufacturing Specialist';
  if (totalScore >= 55) return 'Production Supervisor';
  if (totalScore >= 40) return 'Nashama Line Coordinator';
  return 'Factory Trainee';
}

export function evaluateNashamaLine(params: {
  stationLoads: number[];
  stationsUsed: number;
  efficiency: number;
  idleTimeSec: number;
  flowMetrics: FlowMetrics;
  anyOverloaded: boolean;
  secondsRemaining: number;
  initialSeconds: number;
}): NashamaScoreBreakdown {
  const {
    stationLoads,
    stationsUsed,
    efficiency,
    idleTimeSec,
    flowMetrics,
    anyOverloaded,
    secondsRemaining,
    initialSeconds,
  } = params;

  const minStations = NASHAMA_MIN_STATIONS;
  const maxIdle = stationsUsed * NASHAMA_CYCLE_TIME_SEC - NASHAMA_TOTAL_PROCESSING_SEC;

  const balanceEfficiency = anyOverloaded ? Math.max(0, efficiency * 100 - 25) : Math.round(efficiency * 100);
  const flowEfficiency = flowMetrics.flowEfficiencyPct;
  const idleTimeReduction =
    maxIdle > 0 ? Math.round(Math.max(0, (1 - idleTimeSec / maxIdle) * 100)) : 100;
  const maxWaste = Math.max(1, (stationsUsed - 1) * 2);
  const wasteReduction = Math.round(
    Math.max(0, (1 - flowMetrics.transportationWaste / maxWaste) * 100),
  );
  const workstationScore =
    stationsUsed <= minStations
      ? 100
      : Math.max(0, 100 - (stationsUsed - minStations) * 18);
  const speedScore = Math.round((secondsRemaining / initialSeconds) * 100);

  const totalScore = Math.round(
    balanceEfficiency * 0.22 +
      flowEfficiency * 0.22 +
      idleTimeReduction * 0.14 +
      wasteReduction * 0.14 +
      workstationScore * 0.14 +
      speedScore * 0.14,
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    balanceEfficiency,
    flowEfficiency,
    idleTimeReduction,
    wasteReduction,
    workstationScore,
    speedScore,
    rank: scoreToRank(totalScore),
  };
}

export function pickNashamaHint(params: {
  anyOverloaded: boolean;
  backtrackingCount: number;
  transportationWaste: number;
  nearEmptyCount: number;
  allAssigned: boolean;
}): string | null {
  if (params.anyOverloaded) return 'One workstation appears overloaded.';
  if (!params.allAssigned) return 'Assign all Nashama World Cup tasks before running the line.';
  if (params.backtrackingCount > 0) return 'Your workflow contains backward movement.';
  if (params.transportationWaste > 2) return 'Transportation waste is increasing.';
  if (params.nearEmptyCount > 0) return 'Try grouping sewing tasks together to avoid nearly-empty stations.';
  return 'Strong layout — run the simulation, then submit when flow and balance look good.';
}

export function loadNashamaLeaderboard(labId?: string): NashamaLeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as NashamaLeaderboardEntry[];
    const list = Array.isArray(all) ? all : [];
    const filtered = labId ? list.filter((e) => !e.labId || e.labId === labId) : list;
    return filtered.sort((a, b) => b.totalScore - a.totalScore).slice(0, 20);
  } catch {
    return [];
  }
}

export function saveNashamaLeaderboardEntry(entry: NashamaLeaderboardEntry): void {
  if (typeof window === 'undefined') return;
  const prev = loadNashamaLeaderboard();
  const next = [entry, ...prev].sort((a, b) => b.totalScore - a.totalScore).slice(0, 50);
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
}

export function analyzeNashamaLine(
  stationLoads: number[],
  efficiency: number,
  idleTimeSec: number,
  stationsUsed: number,
  anyOverloaded: boolean,
) {
  return analyzeStudentLine(
    stationLoads,
    NASHAMA_CYCLE_TIME_SEC,
    efficiency,
    idleTimeSec,
    NASHAMA_MIN_STATIONS,
    stationsUsed,
    anyOverloaded,
  );
}
