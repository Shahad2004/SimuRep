import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Lock,
  Play,
  RotateCcw,
  Send,
  Shirt,
  Target,
  Timer,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineBalancingFlowPanel } from './LineBalancingFlowPanel';
import { NashamaCrowdMoodMeter } from './NashamaCrowdMoodMeter';
import { NashamaLevel3BriefingScreen } from './NashamaLevel3BriefingScreen';
import { NashamaLevel3Header, NASHAMA_HEADER_OFFSET_CLASS } from './NashamaLevel3Header';
import { NashamaPhotoBackground } from './NashamaPhotoBackground';
import { firstBackground } from './nashamaLevel3Assets';
import {
  CINEMATIC_DURATION_MS,
  computeCheerPct,
  resolveBackgroundPhoto,
  resolveCrowdMood,
  resolveDimLevel,
  type CinematicKey,
} from './nashamaLevel3Cinematic';
import { NashamaPanel } from './NashamaJordanTheme';
import { EmptyWorkstationVisual } from './EmptyWorkstationVisual';
import { WorkstationTypeImage } from './WorkstationTypeImage';
import {
  nextAvailableWorkstationType,
  WORKSTATION_TYPE_COUNT,
} from './workstationAssets';
import type { StudentJoinedEntry } from '@/app/types/classes';
import { liveSessionToLeaderboardEntries } from '@/app/types/liveSession';
import { getOrCreatePlayerId } from '@/app/services/liveSessionSync';
import { useLiveSession } from '@/app/hooks/useLiveSession';
import {
  calcWorkloadBalancePct,
  computeNashamaFlow,
  evaluateNashamaLine,
  getLeaderboardPosition,
  getNashamaDependentIds,
  getNashamaOptimal,
  getNashamaPrerequisiteIds,
  loadNashamaLeaderboard,
  NASHAMA_CYCLE_TIME_SEC,
  NASHAMA_MIN_STATIONS,
  NASHAMA_RANKS,
  NASHAMA_TASKS,
  NASHAMA_TOTAL_PROCESSING_SEC,
  NASHAMA_WORKSTATION_COST,
  pickNashamaHint,
  saveNashamaLeaderboardEntry,
  sortNashamaTasks,
  type NashamaLeaderboardEntry,
  type NashamaScoreBreakdown,
} from './nashamaLevel3';

import taskCutting from '@/assets/line-balancing/tasks/task_cutting.png';
import taskPacking from '@/assets/line-balancing/tasks/task_packing.png';
import taskSewing from '@/assets/line-balancing/tasks/task_sewing.png';

type Phase = 'briefing' | 'stations' | 'assign' | 'simulate' | 'results';
type StationSlot = { id: string };
type DragPayload =
  | { kind: 'station' }
  | { kind: 'task'; taskId: string }
  | { kind: 'task-move'; taskId: string; fromStationId: string };

const INITIAL_TIMER_SEC = 420;
const NEAR_EMPTY_RATIO = 0.25;

function createEmptyStationSlots(): (StationSlot | null)[] {
  return Array.from(
    { length: Math.max(NASHAMA_MIN_STATIONS + 2, WORKSTATION_TYPE_COUNT) },
    () => null,
  );
}

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0);
}

function parseDragPayload(raw: string | undefined): DragPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function applyTaskDrop(
  stations: StationSlot[],
  prev: Record<string, string[]>,
  stationId: string,
  payload: Extract<DragPayload, { kind: 'task' } | { kind: 'task-move' }>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const st of stations) next[st.id] = [...(prev[st.id] ?? [])];
  const taskId = payload.taskId;
  if (payload.kind === 'task-move') {
    next[payload.fromStationId] = (next[payload.fromStationId] ?? []).filter((id) => id !== taskId);
  } else {
    for (const sid of Object.keys(next)) next[sid] = (next[sid] ?? []).filter((id) => id !== taskId);
  }
  if (!(next[stationId] ?? []).includes(taskId)) next[stationId] = [...(next[stationId] ?? []), taskId];
  return next;
}

function getTaskIcon(group?: string) {
  const g = (group ?? '').toLowerCase();
  if (g.includes('cut') || g.includes('fabric')) return taskCutting;
  if (g.includes('sew') || g.includes('print') || g.includes('assembl')) return taskSewing;
  if (g.includes('quality') || g.includes('finish')) return taskPacking;
  if (g.includes('pack')) return taskPacking;
  return taskSewing;
}

function formatMMSS(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function stationAccent(idx: number) {
  const accents = [
    { ring: 'ring-[#007A3D]/50', border: 'border-[#007A3D]/50', text: 'text-emerald-200' },
    { ring: 'ring-[#CE1126]/40', border: 'border-[#CE1126]/40', text: 'text-red-200' },
    { ring: 'ring-amber-400/40', border: 'border-amber-500/40', text: 'text-amber-200' },
    { ring: 'ring-white/25', border: 'border-white/30', text: 'text-slate-100' },
  ];
  return accents[idx % accents.length];
}

function KahootLeaderboard({
  entries,
  highlightId,
  compact,
}: {
  entries: NashamaLeaderboardEntry[];
  highlightId?: string | null;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 py-4 text-center">Be the first on the factory leaderboard!</p>;
  }
  return (
    <div className={`space-y-2 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
      {entries.slice(0, compact ? 8 : 12).map((row, i) => {
        const isYou = row.id === highlightId;
        const podium =
          i === 0 ? 'border-amber-400/50 bg-amber-950/30' : i === 1 ? 'border-slate-400/40 bg-slate-800/50' : i === 2 ? 'border-orange-600/35 bg-orange-950/20' : '';
        return (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              isYou ? 'border-[#007A3D]/60 bg-[#007A3D]/15 ring-1 ring-[#007A3D]/30' : podium || 'border-slate-700/80 bg-slate-950/50'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold tabular-nums text-sm ${
                i < 3 ? 'bg-[#CE1126]/90 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{row.playerName}</div>
              {!compact && (
                <div className="text-[10px] text-slate-400 flex gap-2 flex-wrap">
                  <span>Bal {row.balanceEfficiencyPct}%</span>
                  <span>Flow {row.flowEfficiencyPct}%</span>
                  <span>Waste↓ {row.wasteReductionPct}%</span>
                  <span>{formatMMSS(row.completionSeconds)}</span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-amber-300 tabular-nums">{row.totalScore}</div>
              <div className="text-[9px] text-slate-500 uppercase">pts</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function NashamaLevel3Challenge({
  studentEntry,
  labPin = '',
  displayName = 'Nashama Student',
  onLeave,
}: {
  studentEntry?: StudentJoinedEntry;
  labPin?: string;
  displayName?: string;
  onLeave: () => void;
}) {
  const labId = studentEntry?.labId;
  const playerId = useMemo(() => (labId ? getOrCreatePlayerId(labId) : null), [labId]);
  const { session, registerPlayer, updateProgress } = useLiveSession(labId, labPin || undefined);
  const tasks = NASHAMA_TASKS;
  const cycleTimeSec = NASHAMA_CYCLE_TIME_SEC;
  const [phase, setPhase] = useState<Phase>('briefing');
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_TIMER_SEC);
  const [coins, setCoins] = useState(900);
  const [stationSlots, setStationSlots] = useState<(StationSlot | null)[]>(createEmptyStationSlots);
  const stations = useMemo(
    () => stationSlots.filter((s): s is StationSlot => s != null),
    [stationSlots],
  );
  const [assignment, setAssignment] = useState<Record<string, string[]>>({});
  const [hint, setHint] = useState<string | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<NashamaScoreBreakdown | null>(null);
  const [localLeaderboard, setLocalLeaderboard] = useState<NashamaLeaderboardEntry[]>(() =>
    loadNashamaLeaderboard(studentEntry?.labId),
  );
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

  const liveLeaderboard = useMemo(
    () => (session && labPin ? liveSessionToLeaderboardEntries(session) : []),
    [session, labPin],
  );
  const leaderboard = liveLeaderboard.length > 0 ? liveLeaderboard : localLeaderboard;
  const highlightId = playerId ?? lastEntryId;
  const [cinematic, setCinematic] = useState<CinematicKey | null>(null);
  const [cinematicCaption, setCinematicCaption] = useState('');

  const assignedIds = useMemo(() => new Set(Object.values(assignment).flat()), [assignment]);
  const unassigned = useMemo(
    () => sortNashamaTasks(tasks.filter((t) => !assignedIds.has(t.id))),
    [tasks, assignedIds],
  );
  const sequencedTasks = useMemo(() => sortNashamaTasks(tasks), [tasks]);

  const stationLoads = useMemo(() => {
    const loads: Record<string, number> = {};
    for (const st of stations) {
      loads[st.id] = sum(
        (assignment[st.id] ?? []).map((id) => tasks.find((t) => t.id === id)?.timeSec ?? 0),
      );
    }
    return loads;
  }, [stations, assignment, tasks]);

  const loadsArr = stations.map((s) => stationLoads[s.id] ?? 0);
  const anyOverloaded = stations.some((s) => (stationLoads[s.id] ?? 0) > cycleTimeSec);
  const allAssigned = unassigned.length === 0 && stations.length > 0;
  const efficiency =
    stations.length > 0 ? NASHAMA_TOTAL_PROCESSING_SEC / (stations.length * cycleTimeSec) : 0;
  const idleTimeSec = Math.max(0, stations.length * cycleTimeSec - NASHAMA_TOTAL_PROCESSING_SEC);
  const workloadBalancePct = calcWorkloadBalancePct(loadsArr, cycleTimeSec);
  const flowMetrics = useMemo(
    () => computeNashamaFlow(assignment, stations.map((s) => s.id)),
    [assignment, stations],
  );
  const optimal = useMemo(() => getNashamaOptimal(), []);
  const nearEmptyCount = loadsArr.filter((l) => l > 0 && l < cycleTimeSec * NEAR_EMPTY_RATIO).length;

  const canSimulate = allAssigned && !anyOverloaded;
  const canSubmit = canSimulate && phase === 'simulate';

  const cheerPct = useMemo(
    () =>
      computeCheerPct({
        phase,
        stationsCount: stations.length,
        minStations: NASHAMA_MIN_STATIONS,
        anyOverloaded,
        allAssigned,
        workloadBalancePct,
        flowEfficiencyPct: flowMetrics.flowEfficiencyPct,
        backtrackingCount: flowMetrics.backtrackingCount,
      }),
    [
      phase,
      stations.length,
      anyOverloaded,
      allAssigned,
      workloadBalancePct,
      flowMetrics.flowEfficiencyPct,
      flowMetrics.backtrackingCount,
    ],
  );

  const crowdMood = useMemo(() => resolveCrowdMood(cheerPct, phase, cinematic), [cheerPct, phase, cinematic]);

  const backgroundPhotoKey = useMemo(
    () => resolveBackgroundPhoto(phase, cinematic, cheerPct),
    [phase, cinematic, cheerPct],
  );

  const crowdMessage = useMemo(() => {
    if (cinematic === 'intro') return 'The fans are waiting… Make them proud!';
    if (cinematic === 'production') return 'Production has started…';
    if (cinematic === 'submit') return 'Trucks loading… crowd roars in anticipation!';
    if (phase === 'simulate') return `Cheer meter rising — ${Math.round(cheerPct)}%`;
    return undefined;
  }, [cinematic, phase, cheerPct]);

  const playCinematic = (key: CinematicKey, caption: string, onDone: () => void) => {
    setCinematicCaption(caption);
    setCinematic(key);
    window.setTimeout(() => {
      setCinematic(null);
      setCinematicCaption('');
      onDone();
    }, CINEMATIC_DURATION_MS[key]);
  };

  const startBuilding = () => {
    playCinematic('intro', 'The fans are waiting… Make them proud!', () => setPhase('stations'));
  };

  const goToAssign = () => {
    playCinematic('production', 'Production has started…', () => setPhase('assign'));
  };

  const goToSimulate = () => setPhase('simulate');
  const leaderboardRank = highlightId ? getLeaderboardPosition(leaderboard, highlightId) : null;

  useEffect(() => {
    if (!labId || !labPin || !playerId) return;
    void registerPlayer({
      playerId,
      displayName,
      progress: 'level3_active',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }, [labId, labPin, playerId, displayName, registerPlayer]);

  useEffect(() => {
    if (phase === 'briefing' || phase === 'results') return;
    if (session?.level3StartedAt) {
      const sync = () => {
        const started = new Date(session.level3StartedAt!).getTime();
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSecondsLeft(Math.max(0, INITIAL_TIMER_SEC - elapsed));
      };
      sync();
      const t = window.setInterval(sync, 1000);
      return () => window.clearInterval(t);
    }
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase, session?.level3StartedAt]);

  useEffect(() => {
    if (!labId || !labPin || !playerId || phase === 'briefing' || phase === 'results') return;
    const pushLiveScore = () => {
      const breakdown = evaluateNashamaLine({
        stationLoads: loadsArr,
        stationsUsed: stations.length,
        efficiency,
        idleTimeSec,
        flowMetrics,
        anyOverloaded,
        secondsRemaining: secondsLeft,
        initialSeconds: INITIAL_TIMER_SEC,
      });
      void updateProgress(playerId, 'level3_active', {
        totalScore: breakdown.totalScore,
        balanceEfficiencyPct: breakdown.balanceEfficiency,
        flowEfficiencyPct: breakdown.flowEfficiency,
        idleTimeReductionPct: breakdown.idleTimeReduction,
        wasteReductionPct: breakdown.wasteReduction,
        workstationScorePct: breakdown.workstationScore,
        speedScorePct: breakdown.speedScore,
        rank: breakdown.rank,
      });
    };
    pushLiveScore();
    const interval = window.setInterval(pushLiveScore, 2500);
    return () => window.clearInterval(interval);
  }, [
    labId,
    labPin,
    playerId,
    phase,
    stations.length,
    loadsArr,
    efficiency,
    idleTimeSec,
    flowMetrics,
    anyOverloaded,
    secondsLeft,
    updateProgress,
  ]);

  const canAddStation = stations.length < WORKSTATION_TYPE_COUNT;

  const addStationAt = (slotIndex: number) => {
    const typeIndex = nextAvailableWorkstationType(stations.map((s) => s.typeIndex));
    if (typeIndex === null) return;
    const id = `n3_st_${Date.now()}`;
    setStationSlots((prev) => {
      if (prev[slotIndex]) return prev;
      const next = [...prev];
      next[slotIndex] = { id, typeIndex };
      return next;
    });
    setAssignment((prev) => ({ ...prev, [id]: prev[id] ?? [] }));
    setCoins((c) => Math.max(0, c - NASHAMA_WORKSTATION_COST));
  };

  const removeStation = (id: string) => {
    setStationSlots((prev) => prev.map((s) => (s?.id === id ? null : s)));
    setAssignment((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const onDropTask = (stationId: string, payload: DragPayload) => {
    if (payload.kind !== 'task' && payload.kind !== 'task-move') return;
    if (payload.kind === 'task') {
      const missing = getNashamaPrerequisiteIds(payload.taskId).filter((id) => !assignedIds.has(id));
      if (missing.length) return;
    }
    setAssignment((prev) => applyTaskDrop(stations, prev, stationId, payload));
  };

  const requestHint = () => {
    setHint(
      pickNashamaHint({
        anyOverloaded,
        backtrackingCount: flowMetrics.backtrackingCount,
        transportationWaste: flowMetrics.transportationWaste,
        nearEmptyCount,
        allAssigned,
      }),
    );
  };

  const finalizeSubmit = () => {
    const completionSeconds = INITIAL_TIMER_SEC - secondsLeft;
    const breakdown = evaluateNashamaLine({
      stationLoads: loadsArr,
      stationsUsed: stations.length,
      efficiency,
      idleTimeSec,
      flowMetrics,
      anyOverloaded,
      secondsRemaining: secondsLeft,
      initialSeconds: INITIAL_TIMER_SEC,
    });
    setScoreBreakdown(breakdown);
    const playerName = studentEntry?.className
      ? `${studentEntry.className} · Lead IE`
      : `Nashama Engineer ${Math.floor(Math.random() * 900 + 100)}`;
    const entry: NashamaLeaderboardEntry = {
      id: `n3_${Date.now()}`,
      playerName,
      totalScore: breakdown.totalScore,
      balanceEfficiencyPct: breakdown.balanceEfficiency,
      flowEfficiencyPct: breakdown.flowEfficiency,
      wasteReductionPct: breakdown.wasteReduction,
      completionSeconds,
      rank: breakdown.rank,
      submittedAt: new Date().toISOString(),
      labId: studentEntry?.labId,
    };
    saveNashamaLeaderboardEntry(entry);
    setLastEntryId(entry.id);
    setLocalLeaderboard(loadNashamaLeaderboard(studentEntry?.labId));
    if (labId && labPin && playerId) {
      void updateProgress(playerId, 'level3_complete', {
        displayName,
        totalScore: breakdown.totalScore,
        balanceEfficiencyPct: breakdown.balanceEfficiency,
        flowEfficiencyPct: breakdown.flowEfficiency,
        idleTimeReductionPct: breakdown.idleTimeReduction,
        wasteReductionPct: breakdown.wasteReduction,
        workstationScorePct: breakdown.workstationScore,
        speedScorePct: breakdown.speedScore,
        rank: breakdown.rank,
        completionSeconds,
        finishedAt: new Date().toISOString(),
      });
    }
    setPhase('results');
  };

  const handleSubmitWithCinematic = () => {
    playCinematic('submit', 'Trucks loading… crowd roars in anticipation!', () => finalizeSubmit());
  };

  const reset = () => {
    setCinematic(null);
    setCinematicCaption('');
    setPhase('briefing');
    setSecondsLeft(INITIAL_TIMER_SEC);
    setCoins(900);
    setStationSlots(createEmptyStationSlots());
    setAssignment({});
    setHint(null);
    setScoreBreakdown(null);
    setLastEntryId(null);
    setLocalLeaderboard(loadNashamaLeaderboard(studentEntry?.labId));
  };

  const liveChecks = [
    {
      label: 'Overload',
      value: anyOverloaded ? 'Yes' : 'Clear',
      ok: !anyOverloaded,
      icon: AlertTriangle,
    },
    {
      label: 'Idle time',
      value: `${idleTimeSec}s`,
      ok: idleTimeSec <= stations.length * 12,
      icon: Timer,
    },
    {
      label: 'Workload balance',
      value: `${workloadBalancePct}%`,
      ok: workloadBalancePct >= 65 && !anyOverloaded,
      icon: Target,
    },
    {
      label: 'Transport waste',
      value: String(flowMetrics.transportationWaste),
      ok: flowMetrics.transportationWaste <= 1,
      icon: Zap,
    },
    {
      label: 'Flow direction',
      value: `${flowMetrics.flowEfficiencyPct}%`,
      ok: flowMetrics.backtrackingCount === 0,
      icon: TrendingUp,
    },
  ];

  const dimLevel = useMemo(() => resolveDimLevel(phase, cinematic), [phase, cinematic]);
  const isBriefingScreen = phase === 'briefing' && cinematic == null;

  return (
    <motion.div className="flex h-dvh flex-col overflow-hidden">
      {isBriefingScreen ? (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <img src={firstBackground} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      ) : (
        <NashamaPhotoBackground
          photoKey={backgroundPhotoKey}
          cinematic={cinematic}
          cinematicCaption={cinematicCaption}
          dimLevel={dimLevel}
        />
      )}
      <NashamaLevel3Header
        variant={isBriefingScreen ? 'briefing' : 'gameplay'}
        secondsLeft={secondsLeft}
        coins={coins}
        onLeave={onLeave}
        showHint={phase === 'assign' || phase === 'simulate'}
        onHint={requestHint}
      />

      {isBriefingScreen ? (
        <div
          className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto ${NASHAMA_HEADER_OFFSET_CLASS}`}
        >
          <NashamaLevel3BriefingScreen
            tasks={tasks}
            cycleTimeSec={cycleTimeSec}
            sequencedTasks={sequencedTasks}
            onStart={startBuilding}
            disabled={cinematic != null}
          />
        </div>
      ) : (
      <div
        className={`relative z-10 min-h-0 flex-1 overflow-y-auto ${NASHAMA_HEADER_OFFSET_CLASS} ${cinematic != null ? 'pointer-events-none opacity-0' : ''}`}
      >
      <div className="container mx-auto px-4 py-6">
        <motion.div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <AnimatePresence>
              {hint && (phase === 'assign' || phase === 'simulate') && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-50"
                >
                  <span className="font-bold text-amber-300">Coach hint:</span> {hint}
                </motion.div>
              )}
            </AnimatePresence>


            {phase === 'stations' && (
              <NashamaPanel className="p-5">
                <div className="text-lg font-bold text-white">Build the production line</div>
                <p className="text-sm text-slate-400 mt-1">
                  Minimum {NASHAMA_MIN_STATIONS} workstations · {NASHAMA_WORKSTATION_COST} coins each · drag stations onto the floor
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: Math.max(NASHAMA_MIN_STATIONS + 2, WORKSTATION_TYPE_COUNT) }).map((_, idx) => {
                    const st = stationSlots[idx];
                    const acc = stationAccent(idx);
                    return (
                      <div
                        key={idx}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          if (!canAddStation || st) return;
                          if (parseDragPayload(e.dataTransfer.getData('text/plain'))?.kind === 'station') addStationAt(idx);
                        }}
                        className={`rounded-xl border p-4 min-h-[100px] ${acc.border} ${st ? 'bg-slate-950/70' : 'border-dashed border-slate-600 bg-black/30'}`}
                      >
                        {st ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <WorkstationTypeImage typeIndex={st.typeIndex} className="w-16 h-16" title={`Workstation ${idx + 1}`} />
                              <div>
                                <span className={`text-sm font-bold ${acc.text}`}>WS {idx + 1}</span>
                                <div className="text-[10px] text-slate-500">Ready</div>
                              </div>
                            </div>
                            <button type="button" onClick={() => removeStation(st.id)} className="text-xs text-slate-400 hover:text-white">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <EmptyWorkstationVisual className="w-16 h-16" />
                            <span className="text-xs text-slate-500">Drop workstation</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <div
                    draggable={canAddStation}
                    onDragStart={(e) => {
                      if (!canAddStation) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'station' }));
                      e.dataTransfer.setDragImage(e.currentTarget, 40, 28);
                    }}
                    className={`rounded-xl border-2 border-dashed px-4 py-2 flex items-center gap-2 ${
                      canAddStation
                        ? 'cursor-grab active:cursor-grabbing border-[#007A3D]/50 bg-[#007A3D]/10'
                        : 'cursor-not-allowed border-slate-600/50 bg-slate-900/40 opacity-50'
                    }`}
                  >
                    <EmptyWorkstationVisual className="w-12 h-12 pointer-events-none" />
                    <span className="text-sm font-semibold text-emerald-100">Drag workstation</span>
                  </div>
                  <button
                    type="button"
                    disabled={stations.length === 0 || cinematic != null}
                    onClick={goToAssign}
                    className="px-5 py-2 rounded-xl bg-[#CE1126] text-white font-bold disabled:opacity-40"
                  >
                    Assign Workstations →
                  </button>
                </div>
              </NashamaPanel>
            )}

            {(phase === 'assign' || phase === 'simulate') && (
              <>
                <NashamaPanel className="p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Live factory checks</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {liveChecks.map((m) => (
                      <div
                        key={m.label}
                        className={`rounded-xl border px-3 py-2 ${m.ok ? 'border-[#007A3D]/40 bg-[#007A3D]/10' : 'border-[#CE1126]/40 bg-[#CE1126]/10'}`}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <m.icon className="w-3 h-3" />
                          {m.label}
                        </div>
                        <div className={`text-base font-bold tabular-nums ${m.ok ? 'text-emerald-200' : 'text-rose-200'}`}>
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Balance efficiency: {Math.round(efficiency * 100)}%</span>
                    <span>Shirt path: {flowMetrics.stationPath.map((n) => `WS${n}`).join(' → ')}</span>
                  </div>
                </NashamaPanel>

                {phase === 'simulate' && (
                  <NashamaPanel className="p-5">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-5 h-5 text-cyan-300" />
                      <div className="text-lg font-bold text-white">Workflow simulation</div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Shirt moves in task order — <span className="text-emerald-400">green = forward</span>,{' '}
                      <span className="text-rose-400">red = backtracking waste</span>
                    </p>
                    <div className="mt-3">
                      <LineBalancingFlowPanel stationCount={stations.length} flowMetrics={flowMetrics} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setPhase('assign')}
                        className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm font-medium"
                      >
                        Keep improving line
                      </button>
                      <button
                        type="button"
                        disabled={!canSubmit || cinematic != null}
                        onClick={handleSubmitWithCinematic}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold disabled:opacity-40 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Submit final evaluation
                      </button>
                    </div>
                  </NashamaPanel>
                )}

                {phase === 'assign' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div
                      className="lg:col-span-1 NashamaPanel p-4 max-h-[560px] overflow-y-auto"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const p = parseDragPayload(e.dataTransfer.getData('text/plain'));
                        if (p?.kind === 'task-move') {
                          const blocked = getNashamaDependentIds(p.taskId).filter((id) => assignedIds.has(id));
                          if (blocked.length) return;
                          setAssignment((prev) => {
                            const next = { ...prev };
                            next[p.fromStationId] = (next[p.fromStationId] ?? []).filter((id) => id !== p.taskId);
                            return next;
                          });
                        }
                      }}
                    >
                      <div className="sticky top-0 bg-slate-900/95 pb-2 z-10">
                        <div className="text-sm font-bold text-white">Task queue</div>
                        <div className="text-[11px] text-slate-400">{unassigned.length} remaining · precedence order</div>
                      </div>
                      <div className="space-y-2 mt-2">
                        {unassigned.map((t) => {
                          const prereq = getNashamaPrerequisiteIds(t.id).filter((id) => !assignedIds.has(id));
                          const canDrag = prereq.length === 0;
                          const step = t.sequenceOrder ?? 0;
                          return (
                            <div
                              key={t.id}
                              draggable={canDrag}
                              onDragStart={(e) => {
                                if (!canDrag) return e.preventDefault();
                                e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'task', taskId: t.id }));
                              }}
                              className={`rounded-lg border p-2.5 flex gap-2 ${canDrag ? 'border-slate-600 bg-slate-950/80 cursor-grab hover:border-[#007A3D]/50' : 'border-amber-500/30 bg-amber-950/20 opacity-80'}`}
                            >
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${canDrag ? 'bg-[#007A3D]/25 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                                {canDrag ? step : <Lock className="w-3.5 h-3.5" />}
                              </div>
                              <img src={getTaskIcon(t.group)} alt="" className="w-8 h-8 object-contain" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{t.label}</div>
                                <div className="text-[11px] text-slate-400">{t.timeSec}s · {t.group}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <NashamaPanel className="lg:col-span-2 p-4">
                      <div className="text-sm font-bold text-white">Nashama production floor</div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stations.map((st, idx) => {
                          const load = stationLoads[st.id] ?? 0;
                          const overloaded = load > cycleTimeSec;
                          const acc = stationAccent(idx);
                          const pct = Math.min(100, Math.round((load / cycleTimeSec) * 100));
                          return (
                            <div
                              key={st.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                const p = parseDragPayload(e.dataTransfer.getData('text/plain'));
                                if (p) onDropTask(st.id, p);
                              }}
                              className={`rounded-xl border p-3 ${acc.border} ${overloaded ? 'ring-2 ring-[#CE1126]/60' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <WorkstationTypeImage typeIndex={st.typeIndex} className="w-14 h-14" title={`Workstation ${idx + 1}`} />
                                <div className="flex-1">
                                  <div className={`text-sm font-bold ${acc.text}`}>WS {idx + 1}</div>
                                  <div className={`text-xs tabular-nums ${overloaded ? 'text-rose-300' : 'text-slate-400'}`}>
                                    {load}s / {cycleTimeSec}s
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                                    <div
                                      className={`h-full ${overloaded ? 'bg-[#CE1126]' : 'bg-[#007A3D]'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1 min-h-[36px]">
                                {(assignment[st.id] ?? []).map((tid) => {
                                  const t = tasks.find((x) => x.id === tid);
                                  if (!t) return null;
                                  return (
                                    <div
                                      key={tid}
                                      draggable
                                      onDragStart={(e) =>
                                        e.dataTransfer.setData(
                                          'text/plain',
                                          JSON.stringify({ kind: 'task-move', taskId: tid, fromStationId: st.id }),
                                        )
                                      }
                                      className="text-[11px] rounded border border-slate-600 bg-black/40 px-2 py-1 cursor-grab text-slate-200"
                                    >
                                      {t.label} ({t.timeSec}s)
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          disabled={!canSimulate}
                          onClick={goToSimulate}
                          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-40 flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Run shirt simulation
                        </button>
                      </div>
                    </NashamaPanel>
                  </div>
                )}
              </>
            )}

            {phase === 'results' && scoreBreakdown && (
              <div className="space-y-5">
                <NashamaPanel variant="success" className="p-8 text-center">
                  <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
                  <div className="text-5xl font-black text-white mt-3 tabular-nums">{scoreBreakdown.totalScore}</div>
                  <div className="text-sm text-amber-200 mt-1">Final factory score</div>
                  {leaderboardRank != null && (
                    <div className="mt-2 text-cyan-300 text-sm font-semibold">Leaderboard position #{leaderboardRank}</div>
                  )}
                  <div className="mt-3 inline-block rounded-full border border-[#007A3D]/50 bg-[#007A3D]/15 px-4 py-1.5 text-lg font-bold text-emerald-200">
                    {scoreBreakdown.rank}
                  </div>
                </NashamaPanel>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['Balance efficiency', scoreBreakdown.balanceEfficiency],
                    ['Flow efficiency', scoreBreakdown.flowEfficiency],
                    ['Idle time reduction', scoreBreakdown.idleTimeReduction],
                    ['Transport waste reduction', scoreBreakdown.wasteReduction],
                    ['Workstation score', scoreBreakdown.workstationScore],
                    ['Completion speed', scoreBreakdown.speedScore],
                  ].map(([label, val]) => (
                    <div key={label as string} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                      <div className="text-[11px] text-slate-400">{label}</div>
                      <div className="text-2xl font-bold text-white tabular-nums">{val}%</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-4 gap-3 text-sm">
                  {[
                    ['Workstation efficiency', `${Math.round(efficiency * 100)}%`],
                    ['Flow efficiency', `${flowMetrics.flowEfficiencyPct}%`],
                    ['Transportation waste', String(flowMetrics.transportationWaste)],
                    ['Idle time', `${idleTimeSec}s`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-slate-700 bg-black/40 p-3">
                      <div className="text-slate-500 text-xs">{k}</div>
                      <div className="font-bold text-white">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <NashamaPanel className="p-4">
                    <div className="text-sm font-bold text-white">Your production line</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      {flowMetrics.stationPath.map((n) => `WS${n}`).join(' → ')}
                    </div>
                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                      {stations.map((st, idx) => {
                        const load = stationLoads[st.id] ?? 0;
                        return (
                          <div key={st.id} className="rounded-lg border border-slate-700 px-2 py-1.5 text-[11px]">
                            <span className="text-[#CE1126] font-semibold">WS{idx + 1}</span>{' '}
                            <span className="text-slate-400">{load}s</span> —{' '}
                            <span className="text-slate-200">
                              {(assignment[st.id] ?? []).map((id) => tasks.find((t) => t.id === id)?.label).join(', ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </NashamaPanel>
                  <NashamaPanel className="p-4 border-[#007A3D]/30">
                    <div className="text-sm font-bold text-[#007A3D]">Recommended industrial solution</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {optimal.length} stations · forward flow · balanced · no near-empty WS
                    </p>
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                      {optimal.map((st, i) => (
                        <div key={st.id} className="rounded-lg border border-[#007A3D]/25 bg-[#007A3D]/5 px-2 py-1.5 text-[11px]">
                          <span className="text-emerald-300 font-semibold">WS{i + 1}</span>{' '}
                          <span className="text-slate-400">{st.loadSec}s</span> —{' '}
                          <span className="text-slate-200">{st.tasks.map((t) => t.label).join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </NashamaPanel>
                </div>

                <NashamaPanel className="p-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-amber-400" />
                      <div>
                        <div className="text-lg font-bold text-white">Live leaderboard</div>
                        <div className="text-[11px] text-slate-400">Kahoot-style · updates as classmates finish</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <KahootLeaderboard entries={leaderboard} highlightId={highlightId} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {NASHAMA_RANKS.map((r) => (
                      <span
                        key={r}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          r === scoreBreakdown.rank
                            ? 'border-[#007A3D] bg-[#007A3D]/20 text-emerald-200 font-semibold'
                            : 'border-slate-700 text-slate-500'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </NashamaPanel>

                <div className="flex justify-end">
                  <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 font-semibold flex items-center gap-2 hover:bg-slate-800">
                    <RotateCcw className="w-4 h-4" />
                    Play again
                  </button>
                </div>
              </div>
            )}
          </div>

          {(phase === 'assign' || phase === 'simulate' || phase === 'stations') && (
            <aside className="lg:col-span-4 space-y-4 lg:self-start">
              <NashamaCrowdMoodMeter mood={crowdMood} cheerPct={cheerPct} message={crowdMessage} />
              <NashamaPanel className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300/90">Live ranks</div>
                <div className="mt-3">
                  <KahootLeaderboard entries={leaderboard} highlightId={highlightId} compact />
                </div>
              </NashamaPanel>
              <NashamaPanel className="p-4">
                <div className="text-xs font-bold text-slate-400 uppercase">Your objective</div>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                  <li>✓ Respect {cycleTimeSec}s cycle time</li>
                  <li>✓ Balance workloads</li>
                  <li>✓ Minimize idle time</li>
                  <li>✓ Minimize transport waste</li>
                  <li>✓ Avoid backtracking</li>
                </ul>
              </NashamaPanel>
            </aside>
          )}

          {phase === 'results' && (
            <aside className="lg:col-span-4 lg:self-start">
              <NashamaCrowdMoodMeter mood={crowdMood} cheerPct={cheerPct} message={crowdMessage} />
            </aside>
          )}
        </motion.div>
      </div>
      </div>
      )}
    </motion.div>
  );
}
