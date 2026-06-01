import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Shirt, TrendingDown, TrendingUp } from 'lucide-react';
import type { LineBalancingTask } from '@/app/types/classes';
import type { FlowMetrics } from './lineBalancingEngine';
import { buildFlowPlaybackPlan, flowMetricsSignature } from './lineBalancingFlowPlayback';
import { CycleTimeBanner } from './CycleTimeBanner';

import {
  getWorkstationImageForTaskGroup,
  getWorkstationImageUrl,
  workstationTypeIndexForOrder,
} from './workstationAssets';
import taskCutting from '@/assets/line-balancing/tasks/task_cutting.png';
import taskPacking from '@/assets/line-balancing/tasks/task_packing.png';
import taskSewing from '@/assets/line-balancing/tasks/task_sewing.png';

type FlowPanelProps = {
  stationCount: number;
  flowMetrics: FlowMetrics;
  stationLabels?: string[];
  stationIds?: string[];
  assignment?: Record<string, string[]>;
  tasks?: LineBalancingTask[];
  taskOrder?: string[];
  cycleTimeSec?: number;
  onAnimationComplete?: () => void;
  autoPlay?: boolean;
};

function groupToShirtProductImage(group?: string): string {
  const g = (group ?? '').toLowerCase();
  if (g.includes('cut')) return taskCutting;
  if (g.includes('pack') || g.includes('quality') || g.includes('finish')) return taskPacking;
  return taskSewing;
}

function resolveStationImages(
  stationCount: number,
  stationIds: string[] | undefined,
  assignment: Record<string, string[]> | undefined,
  tasks: LineBalancingTask[] | undefined,
): string[] {
  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  return Array.from({ length: stationCount }, (_, i) => {
    const stId = stationIds?.[i];
    if (!stId || !assignment) return getWorkstationImageUrl(workstationTypeIndexForOrder(i));
    const assigned = assignment[stId] ?? [];
    const groups = assigned
      .map((id) => taskById.get(id)?.group)
      .filter(Boolean) as string[];
    const primary = groups[0] ?? '';
    return getWorkstationImageForTaskGroup(primary);
  });
}

function resolveTaskGroupForStep(
  stepIndex: number,
  taskOrder: string[],
  tasks: LineBalancingTask[] | undefined,
): string {
  const taskId = taskOrder[stepIndex];
  return tasks?.find((t) => t.id === taskId)?.group ?? '';
}

function FlyingShirtTransfer({
  fromX,
  toX,
  beltY,
  shirtImg,
  isBackward,
  durationSec,
}: {
  fromX: number;
  toX: number;
  beltY: number;
  shirtImg: string;
  isBackward: boolean;
  durationSec: number;
}) {
  const midX = (fromX + toX) / 2;
  const arcHeight = isBackward ? 36 : 72;
  const pathD = `M ${fromX} ${beltY} Q ${midX} ${beltY - arcHeight} ${toX} ${beltY}`;

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
        <motion.path
          d={pathD}
          fill="none"
          stroke={isBackward ? '#f43f5e' : '#34d399'}
          strokeWidth={2.5}
          strokeDasharray={isBackward ? '6 4' : undefined}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 0.95 }}
          transition={{ duration: durationSec * 0.85, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div
        className="absolute z-40 pointer-events-none"
        style={{ bottom: '4.25rem', width: 52, marginLeft: -26 }}
        initial={{ left: fromX, y: 0, opacity: 1, rotate: 0, scale: 1 }}
        animate={{
          left: [fromX, midX, toX],
          y: [0, -arcHeight, 0],
          rotate: isBackward ? [0, -28, 18] : [0, 14, -6],
          scale: [1, 1.22, 1],
        }}
        transition={{ duration: durationSec, ease: 'easeInOut', times: [0, 0.48, 1] }}
      >
        <img
          src={shirtImg}
          alt="Shirt transferring"
          className={`w-[3.25rem] h-[3.25rem] object-contain drop-shadow-lg ${isBackward ? 'hue-rotate-[-20deg]' : ''}`}
          draggable={false}
        />
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            isBackward
              ? 'bg-rose-950/95 text-rose-200 border border-rose-500/50'
              : 'bg-emerald-950/95 text-emerald-200 border border-emerald-500/50'
          }`}
        >
          {isBackward ? '↩ backtracking' : '→ forward flow'}
        </motion.span>
      </motion.div>
    </>
  );
}

export function LineBalancingFlowPanel({
  stationCount,
  flowMetrics,
  stationLabels,
  stationIds,
  assignment,
  tasks,
  taskOrder = [],
  cycleTimeSec,
  onAnimationComplete,
  autoPlay = true,
}: FlowPanelProps) {
  const [planIndex, setPlanIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [traveling, setTraveling] = useState(false);
  const [runComplete, setRunComplete] = useState(false);
  const factoryRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centersPx, setCentersPx] = useState<number[]>([]);

  const path = flowMetrics.stationPath;
  const labels = flowMetrics.taskLabels;
  const totalTasks = path.length;

  const playbackPlan = useMemo(
    () => buildFlowPlaybackPlan(path, flowMetrics.segments),
    [path, flowMetrics.segments],
  );

  const flowSignature = useMemo(
    () => flowMetricsSignature(flowMetrics, stationCount, stationIds),
    [flowMetrics, stationCount, stationIds],
  );

  const stationImages = useMemo(
    () => resolveStationImages(stationCount, stationIds, assignment, tasks),
    [stationCount, stationIds, assignment, tasks],
  );

  const stationPositions = useMemo(() => {
    const count = Math.max(1, stationCount);
    return Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      label: stationLabels?.[i] ?? `WS${i + 1}`,
      image: stationImages[i] ?? getWorkstationImageUrl(workstationTypeIndexForOrder(i)),
    }));
  }, [stationCount, stationLabels, stationImages]);

  const measureCenters = useCallback(() => {
    const root = factoryRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const next = stationPositions.map((_, i) => {
      const el = stationRefs.current[i];
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.left - rootRect.left + r.width / 2;
    });
    setCentersPx(next);
  }, [stationPositions.length]);

  useLayoutEffect(() => {
    measureCenters();
    const ro = new ResizeObserver(() => measureCenters());
    if (factoryRef.current) ro.observe(factoryRef.current);
    return () => ro.disconnect();
  }, [measureCenters, stationCount, flowSignature]);

  const currentStep = playbackPlan[planIndex];
  const activeMove =
    traveling && currentStep?.kind === 'move' ? currentStep : null;

  const taskIndex =
    currentStep?.kind === 'dwell'
      ? currentStep.taskIndex
      : activeMove
        ? activeMove.segmentIndex + 1
        : findLastDwellTaskIndex(playbackPlan, planIndex);

  const dwellStation =
    currentStep?.kind === 'dwell'
      ? currentStep.station
      : activeMove
        ? activeMove.from
        : path[taskIndex] ?? 1;

  const moveTargetStation = activeMove?.to ?? dwellStation;

  const currentTask = labels[taskIndex] ?? '';
  const nextTaskIndex = Math.min(taskIndex + 1, totalTasks - 1);
  const nextTask = labels[nextTaskIndex] ?? '';
  const currentGroup = resolveTaskGroupForStep(taskIndex, taskOrder, tasks);
  const transitGroup = resolveTaskGroupForStep(
    activeMove ? activeMove.segmentIndex + 1 : nextTaskIndex,
    taskOrder,
    tasks,
  );
  const shirtProductImg = groupToShirtProductImage(traveling ? transitGroup : currentGroup);

  const isBackwardMove = activeMove?.backward ?? false;
  const transitDurationSec = isBackwardMove ? 1.15 : 0.85;
  const beltY = 168;

  const completedMoves = playbackPlan
    .slice(0, planIndex)
    .filter((s) => s.kind === 'move').length;
  const totalMoves = playbackPlan.filter((s) => s.kind === 'move').length;

  const stationCenterPx = (stationIndex: number) => {
    const idx = stationIndex - 1;
    if (centersPx.length > idx && centersPx[idx] > 0) return centersPx[idx];
    return ((stationIndex - 0.5) / Math.max(1, stationCount)) * (factoryRef.current?.clientWidth ?? 400);
  };

  const resetAnimation = useCallback(() => {
    setPlanIndex(0);
    setTraveling(false);
    setRunComplete(false);
    setPlaying(true);
    measureCenters();
  }, [measureCenters]);

  useEffect(() => {
    setPlanIndex(0);
    setTraveling(false);
    setRunComplete(false);
    setPlaying(autoPlay);
    measureCenters();
  }, [flowSignature, autoPlay, measureCenters]);

  useEffect(() => {
    if (!playing || runComplete) return;

    const step = playbackPlan[planIndex];
    if (!step) {
      const finalTimer = window.setTimeout(() => {
        setRunComplete(true);
        onAnimationComplete?.();
      }, 1200);
      return () => window.clearTimeout(finalTimer);
    }

    if (step.kind === 'dwell') {
      if (traveling) return;
      const nextSeg = flowMetrics.segments[step.taskIndex];
      const dwellMs =
        nextSeg && nextSeg.from !== nextSeg.to && nextSeg.backward ? 1400 : 900;

      const dwellTimer = window.setTimeout(() => {
        setPlanIndex((i) => i + 1);
      }, dwellMs);
      return () => window.clearTimeout(dwellTimer);
    }

    if (!traveling) {
      setTraveling(true);
      return;
    }

    const transitTimer = window.setTimeout(() => {
      setTraveling(false);
      setPlanIndex((i) => i + 1);
      measureCenters();
    }, step.backward ? 1150 : 880);

    return () => window.clearTimeout(transitTimer);
  }, [playing, traveling, runComplete, planIndex, playbackPlan, flowMetrics.segments, onAnimationComplete, measureCenters]);

  const visitedStations = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i <= planIndex && i < playbackPlan.length; i++) {
      const s = playbackPlan[i];
      if (s.kind === 'dwell') set.add(s.station);
      if (s.kind === 'move') {
        set.add(s.from);
        set.add(s.to);
      }
    }
    if (!traveling && currentStep?.kind === 'dwell') set.add(currentStep.station);
    return set;
  }, [playbackPlan, planIndex, traveling, currentStep]);

  const progressPct =
    playbackPlan.length > 0
      ? Math.round(
          ((planIndex + (traveling ? 0.45 : 0)) / Math.max(1, playbackPlan.length)) * 100,
        )
      : 0;

  const activeSegmentIndex = activeMove?.segmentIndex ?? -1;

  const completedSegmentIndices = useMemo(() => {
    const done = new Set<number>();
    for (let i = 0; i < planIndex; i++) {
      const s = playbackPlan[i];
      if (s.kind === 'move') done.add(s.segmentIndex);
    }
    return done;
  }, [planIndex, playbackPlan]);

  const showStaticPath = centersPx.length >= 2 && flowMetrics.segments.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {cycleTimeSec != null && cycleTimeSec > 0 ? (
          <CycleTimeBanner cycleTimeSec={cycleTimeSec} levelLabel="Production flow" size="md" />
        ) : (
          <div className="text-sm font-semibold text-white">Shirt flow through your line</div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 tabular-nums">
          <span>
            Task <span className="text-cyan-200 font-bold">{Math.min(taskIndex + 1, totalTasks)}</span> of{' '}
            <span className="text-white font-semibold">{totalTasks}</span>
          </span>
          {totalMoves > 0 && (
            <span>
              Moves <span className="text-white font-semibold">{completedMoves + (traveling ? 1 : 0)}</span> /{' '}
              {totalMoves}
              {flowMetrics.backtrackingCount > 0 && (
                <span className="ml-1 text-rose-400">
                  · {flowMetrics.backtrackingCount} backtrack
                  {flowMetrics.backtrackingCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className={`h-full ${
            isBackwardMove
              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
          }`}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      <div
        ref={factoryRef}
        className="relative rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 p-4 min-h-[300px] overflow-hidden"
      >
        {showStaticPath && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" aria-hidden>
            {flowMetrics.segments.map((seg, i) => {
              if (seg.from === seg.to) return null;
              const fromX = stationCenterPx(seg.from);
              const toX = stationCenterPx(seg.to);
              const midX = (fromX + toX) / 2;
              const arcH = seg.backward ? 28 : 52;
              const d = `M ${fromX} ${beltY} Q ${midX} ${beltY - arcH} ${toX} ${beltY}`;
              const isPast = completedSegmentIndices.has(i);
              const isCurrent = i === activeSegmentIndex && traveling;
              return (
                <path
                  key={`static-${i}`}
                  d={d}
                  fill="none"
                  stroke={
                    isCurrent
                      ? seg.backward
                        ? 'rgba(244,63,94,0.9)'
                        : 'rgba(52,211,153,0.85)'
                      : isPast
                        ? seg.backward
                          ? 'rgba(244,63,94,0.55)'
                          : 'rgba(52,211,153,0.45)'
                        : seg.backward
                          ? 'rgba(244,63,94,0.25)'
                          : 'rgba(52,211,153,0.2)'
                  }
                  strokeWidth={isCurrent ? 3 : 1.5}
                  strokeDasharray={seg.backward ? '5 4' : undefined}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        )}

        <div className="absolute left-3 right-3 bottom-[4.5rem] h-3 rounded-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600/80 shadow-inner">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
            animate={{ x: ['-30%', '130%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative flex justify-between gap-2 px-1 pb-20 pt-2">
          {stationPositions.map((pos, i) => {
            const isActive = pos.index === dwellStation && !traveling;
            const isTransitTarget = traveling && pos.index === moveTargetStation;
            const isBackwardEndpoint =
              traveling &&
              isBackwardMove &&
              (pos.index === dwellStation || pos.index === moveTargetStation);
            const visited = visitedStations.has(pos.index);
            const hasShirt = isActive && !traveling;

            return (
              <div
                key={pos.index}
                ref={(el) => {
                  stationRefs.current[i] = el;
                }}
                className={`flex flex-col items-center flex-1 min-w-0 transition-all duration-300 ${
                  isActive ? 'scale-[1.04] z-20' : ''
                }`}
              >
                <div
                  className={`relative w-full max-w-[110px] rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                    isBackwardEndpoint
                      ? 'border-rose-400/80 bg-rose-950/35 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/25'
                      : isActive
                        ? 'border-cyan-400/70 bg-cyan-950/30 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                        : isTransitTarget
                          ? isBackwardMove
                            ? 'border-rose-400/60 bg-rose-950/25 ring-2 ring-rose-400/40'
                            : 'border-amber-400/50 bg-amber-950/20 ring-1 ring-amber-400/30'
                          : visited
                            ? 'border-slate-600 bg-slate-900/70'
                            : 'border-slate-700/80 bg-slate-950/50 opacity-75'
                  }`}
                >
                  <div className="aspect-[4/3] bg-slate-900/80 flex items-end justify-center p-1">
                    <img
                      src={pos.image}
                      alt={pos.label}
                      className="w-full h-auto max-h-[72px] object-contain object-bottom drop-shadow-md"
                      draggable={false}
                    />
                  </div>
                  <div className="px-2 py-1.5 border-t border-slate-700/80 bg-slate-950/90 text-center">
                    <div className="text-[10px] font-bold text-slate-200">{pos.label}</div>
                  </div>

                  <AnimatePresence>
                    {hasShirt && (
                      <motion.div
                        key={`ws-shirt-${planIndex}-${taskIndex}`}
                        initial={{ opacity: 0, y: -20, scale: 0.6 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 z-30"
                      >
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="relative"
                        >
                          <div className="absolute -inset-2 rounded-full bg-cyan-400/20 blur-md" />
                          <img
                            src={shirtProductImg}
                            alt="Shirt in production"
                            className="w-11 h-11 object-contain drop-shadow-lg relative z-10"
                            draggable={false}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {traveling && activeMove && centersPx.length >= 2 && (
            <FlyingShirtTransfer
              key={`fly-${planIndex}-${activeMove.from}-${activeMove.to}`}
              fromX={stationCenterPx(activeMove.from)}
              toX={stationCenterPx(activeMove.to)}
              beltY={beltY}
              shirtImg={shirtProductImg}
              isBackward={activeMove.backward}
              durationSec={transitDurationSec}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={traveling ? `move-${planIndex}` : `task-${planIndex}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-2 flex flex-col items-center gap-1 max-w-[92%]"
          >
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-lg ${
                isBackwardMove
                  ? 'border-rose-500/50 bg-rose-950/80'
                  : 'border-cyan-500/40 bg-cyan-950/70'
              }`}
            >
              <Shirt className={`w-4 h-4 shrink-0 ${isBackwardMove ? 'text-rose-300' : 'text-cyan-300'}`} />
              <span
                className={`text-xs font-semibold text-center ${
                  isBackwardMove ? 'text-rose-100' : 'text-cyan-100'
                }`}
              >
                {traveling && activeMove
                  ? activeMove.backward
                    ? `↩ Backtracking to ${posLabel(activeMove.to)} · ${nextTask}`
                    : `Moving to ${posLabel(activeMove.to)} · ${nextTask}`
                  : `${currentTask} @ ${posLabel(dwellStation)}`}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-1 flex flex-wrap gap-2 justify-center text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-emerald-200">
            <TrendingUp className="w-3 h-3" /> Forward (green)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/30 px-2 py-0.5 text-rose-200">
            <TrendingDown className="w-3 h-3" /> Backward (red)
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Full shirt path (task order)
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {path.map((st, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums max-w-[140px] truncate ${
                  i === taskIndex && !traveling
                    ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/40'
                    : i < taskIndex || (traveling && i <= activeMove?.segmentIndex! + 1)
                      ? 'bg-slate-800 text-slate-300 border border-slate-600'
                      : 'bg-slate-900/50 text-slate-500 border border-slate-700'
                }`}
                title={labels[i]}
              >
                {st !== path[i - 1] || i === 0 ? `WS${st}` : '·'}
                <span className="hidden sm:inline text-slate-500 font-normal ml-1">
                  {labels[i]?.split(' ')[0]}
                </span>
              </span>
              {i < path.length - 1 && path[i] !== path[i + 1] ? (
                <ArrowRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    flowMetrics.segments[i]?.backward ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                />
              ) : i < path.length - 1 ? (
                <span className="text-slate-600 text-[10px] px-0.5">+</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetAnimation}
          className="px-3 py-2 rounded-xl bg-cyan-600/90 text-white text-sm font-semibold hover:bg-cyan-500"
        >
          Replay full flow
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700"
        >
          {playing ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  );
}

function posLabel(stationIndex: number) {
  return `WS${stationIndex}`;
}

function findLastDwellTaskIndex(
  plan: ReturnType<typeof buildFlowPlaybackPlan>,
  beforeIndex: number,
): number {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const s = plan[i];
    if (s.kind === 'dwell') return s.taskIndex;
  }
  return 0;
}
