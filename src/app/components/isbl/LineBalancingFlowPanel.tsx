import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Shirt, TrendingDown, TrendingUp } from 'lucide-react';
import type { LineBalancingTask } from '@/app/types/classes';
import type { FlowMetrics } from './lineBalancingEngine';

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
  /** Level 1 layout — used to pick workstation art per station */
  stationIds?: string[];
  assignment?: Record<string, string[]>;
  tasks?: LineBalancingTask[];
  /** Task ids in production sequence (same order as flowMetrics.taskLabels) */
  taskOrder?: string[];
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

/** Arc flight between two station centers — shirts “fly” along the transfer path */
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

      {/* Ghost trail shirts */}
      {[0.25, 0.5].map((t) => (
        <motion.div
          key={t}
          className="absolute z-[25] pointer-events-none"
          style={{ bottom: '4.25rem', width: 40, marginLeft: -20 }}
          initial={{ left: fromX, opacity: 0, scale: 0.5 }}
          animate={{
            left: [fromX, midX, toX],
            y: [0, -arcHeight * (isBackward ? 0.5 : 1), 0],
            opacity: [0, 0.55, 0],
            scale: [0.5, 0.85, 0.4],
          }}
          transition={{ duration: durationSec, ease: 'easeInOut', times: [0, t, 1] }}
        >
          <img src={shirtImg} alt="" className="w-8 h-8 object-contain opacity-60 blur-[0.5px]" draggable={false} />
        </motion.div>
      ))}

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
        <motion.div
          animate={{ filter: ['drop-shadow(0 4px 8px rgba(0,0,0,0.4))', 'drop-shadow(0 12px 20px rgba(34,211,238,0.35))', 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'] }}
          transition={{ duration: durationSec }}
        >
          <img
            src={shirtImg}
            alt="Shirt transferring"
            className={`w-[3.25rem] h-[3.25rem] object-contain ${isBackward ? 'hue-rotate-[-20deg]' : ''}`}
            draggable={false}
          />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            isBackward
              ? 'bg-rose-950/95 text-rose-200 border border-rose-500/50'
              : 'bg-emerald-950/95 text-emerald-200 border border-emerald-500/50'
          }`}
        >
          {isBackward ? '↩ waste transfer' : '✈ to next WS'}
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
  onAnimationComplete,
  autoPlay = true,
}: FlowPanelProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  /** Shirt is moving from path[step] → path[step + 1] */
  const [traveling, setTraveling] = useState(false);
  const factoryRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centersPx, setCentersPx] = useState<number[]>([]);

  const path = flowMetrics.stationPath;
  const labels = flowMetrics.taskLabels;
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
  }, [measureCenters, stationCount]);

  const dwellStation = path[step] ?? 1;
  const transitToStation = step < path.length - 1 ? path[step + 1] : dwellStation;
  const currentTask = labels[step] ?? '';
  const nextTask = labels[step + 1] ?? '';
  const currentGroup = resolveTaskGroupForStep(step, taskOrder, tasks);
  const transitGroup = resolveTaskGroupForStep(step + 1, taskOrder, tasks);
  const shirtProductImg = groupToShirtProductImage(traveling ? transitGroup : currentGroup);

  const activeSegment = step < path.length - 1 ? flowMetrics.segments[step] : null;
  const isBackwardMove = activeSegment?.backward ?? false;
  const transitDurationSec = isBackwardMove ? 1.15 : 0.88;
  const beltY = 168;

  const stationCenterPx = (stationIndex: number) => {
    const idx = stationIndex - 1;
    if (centersPx.length > idx && centersPx[idx] > 0) return centersPx[idx];
    return ((stationIndex - 0.5) / Math.max(1, stationCount)) * (factoryRef.current?.clientWidth ?? 400);
  };

  useEffect(() => {
    if (!playing || traveling) return;
    if (step >= path.length - 1) {
      onAnimationComplete?.();
      return;
    }
    const seg = flowMetrics.segments[step];
    const dwellMs = seg?.backward ? 2000 : 1400;
    const transitMs = seg?.backward ? 1150 : 880;
    let transitTimer: ReturnType<typeof window.setTimeout> | undefined;
    const dwellTimer = window.setTimeout(() => {
      setTraveling(true);
      transitTimer = window.setTimeout(() => {
        setStep((s) => s + 1);
        setTraveling(false);
      }, transitMs);
    }, dwellMs);
    return () => {
      window.clearTimeout(dwellTimer);
      if (transitTimer != null) window.clearTimeout(transitTimer);
    };
  }, [playing, traveling, step, path.length, flowMetrics.segments, onAnimationComplete]);

  const visitedStations = useMemo(() => new Set(path.slice(0, step + 1)), [path, step]);

  return (
    <div className="space-y-4">
      <div
        ref={factoryRef}
        className="relative rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 p-4 min-h-[280px] overflow-hidden"
      >
        {/* Conveyor belt */}
        <div className="absolute left-3 right-3 bottom-[4.5rem] h-3 rounded-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600/80 shadow-inner">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
            animate={{ x: ['-30%', '130%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>


        {/* Workstations */}
        <div className="relative flex justify-between gap-2 px-1 pb-20 pt-2">
          {stationPositions.map((pos, i) => {
            const isActive = pos.index === dwellStation && !traveling;
            const isTransitTarget = traveling && pos.index === transitToStation;
            const visited = visitedStations.has(pos.index);
            const hasShirt = isActive && !traveling;

            return (
              <div
                key={pos.index}
                ref={(el) => {
                  stationRefs.current[i] = el;
                }}
                className={`flex flex-col items-center flex-1 min-w-0 transition-all duration-300 ${
                  isActive ? 'scale-[1.03] z-20' : ''
                }`}
              >
                <div
                  className={`relative w-full max-w-[110px] rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                    isActive
                      ? 'border-cyan-400/70 bg-cyan-950/30 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                      : isTransitTarget
                        ? 'border-amber-400/50 bg-amber-950/20 ring-1 ring-amber-400/30'
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

                  {/* Shirt at workstation */}
                  <AnimatePresence>
                    {hasShirt && (
                      <motion.div
                        key={`ws-shirt-${step}`}
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

        {/* Flying shirt transfer along arc path */}
        <AnimatePresence>
          {traveling && centersPx.length >= 2 && (
            <FlyingShirtTransfer
              key={`fly-${step}`}
              fromX={stationCenterPx(dwellStation)}
              toX={stationCenterPx(transitToStation)}
              beltY={beltY}
              shirtImg={shirtProductImg}
              isBackward={isBackwardMove}
              durationSec={transitDurationSec}
            />
          )}
        </AnimatePresence>

        {/* Current task callout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={traveling ? `move-${step}` : `task-${step}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-4 py-2 shadow-lg max-w-[90%]"
          >
            <Shirt className="w-4 h-4 text-cyan-300 shrink-0" />
            <span className="text-xs font-semibold text-cyan-100 truncate">
              {traveling ? `Moving → ${nextTask}` : currentTask}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="mt-1 flex flex-wrap gap-2 justify-center text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-emerald-200">
            <TrendingUp className="w-3 h-3" /> Forward flow (green)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/30 px-2 py-0.5 text-rose-200">
            <TrendingDown className="w-3 h-3" /> Backtracking (red)
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Shirt path (task sequence)</div>
        <div className="flex flex-wrap items-center gap-1">
          {path.map((st, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums ${
                  i === step
                    ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/40'
                    : i < step
                      ? 'bg-slate-800 text-slate-300 border border-slate-600'
                      : 'bg-slate-900/50 text-slate-500 border border-slate-700'
                }`}
              >
                WS{st}
              </span>
              {i < path.length - 1 ? (
                <ArrowRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    flowMetrics.segments[i]?.backward ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                />
              ) : null}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Step {step + 1} of {path.length}: <span className="text-slate-300">{currentTask}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setTraveling(false);
            setPlaying(true);
            measureCenters();
          }}
          className="px-3 py-2 rounded-xl bg-cyan-600/90 text-white text-sm font-semibold hover:bg-cyan-500"
        >
          Replay animation
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700"
        >
          {playing ? 'Pause' : 'Resume'}
        </button>
        {step < path.length - 1 && (
          <button
            type="button"
            onClick={() => {
              if (step >= path.length - 1 || traveling) return;
              const seg = flowMetrics.segments[step];
              setTraveling(true);
              window.setTimeout(() => {
                setStep((s) => Math.min(path.length - 1, s + 1));
                setTraveling(false);
              }, seg?.backward ? 1150 : 880);
            }}
            className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700"
          >
            Next step
          </button>
        )}
      </div>
    </div>
  );
}
