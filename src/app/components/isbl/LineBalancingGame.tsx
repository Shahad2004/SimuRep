import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Coins,
  Factory,
  ListOrdered,
  Lock,
  LogOut,
  RotateCcw,
  Send,
  Timer,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  saveLabPerformanceResult,
  type LineBalancingScenario,
  type LineBalancingTask,
  type ScenarioDefinition,
  type StudentJoinedEntry,
} from '@/app/types/classes';

import girlExplain from '@/assets/line-balancing/character/girl_explain.png';
import girlIdle from '@/assets/line-balancing/character/girl_idle.png';
import girlPointLeft from '@/assets/line-balancing/character/girl_point_left.png';
import girlSuccess from '@/assets/line-balancing/character/girl_success.png';
import girlThink from '@/assets/line-balancing/character/girl_think.png';

import wsCutting from '@/assets/line-balancing/workstations/ws_cutting.png';
import wsPacking from '@/assets/line-balancing/workstations/ws_packing.png';
import wsQuality from '@/assets/line-balancing/workstations/ws_quality.png';
import wsSewing from '@/assets/line-balancing/workstations/ws_sewing.png';
import stationEmpty from '@/assets/line-balancing/workstations/station_empty.png';

import taskCutting from '@/assets/line-balancing/tasks/task_cutting.png';
import taskPacking from '@/assets/line-balancing/tasks/task_packing.png';
import taskSewing from '@/assets/line-balancing/tasks/task_sewing.png';
import htuLogo from '@/assets/icons/htu-industrial-virtual-lab.png';

interface LineBalancingGameProps {
  scenario: ScenarioDefinition;
  lineBalancing?: LineBalancingScenario;
  studentEntry?: StudentJoinedEntry;
  onLeave: () => void;
}

const TYPE_MS_PER_CHAR = 72;
const LINE_PAUSE_MS = 1100;
const FEEDBACK_TOAST_MS = 2800;
/** Add your MP3 loop as `public/simulab-ambient.mp3` in the project root. */
const BG_MUSIC_PUBLIC_PATH = '/simulab-ambient.mp3';
const DEFAULT_CYCLE_TIME_SEC = 60;
const FIXED_WORKSTATION_COST_COINS = 100;
/** Fixed shirt flow: each task requires earlier steps to be on a workstation first. */
const TASK_SEQUENCE: string[] = [
  't_cut_panels',
  't_trim_edges',
  't_mark_points',
  't_sew_shoulders',
  't_attach_sleeves',
  't_close_sides',
  't_hem_bottom',
  't_quality_check',
  't_fold_garment',
  't_pack_label',
];

const FIXED_LINE_BALANCING_TASKS: LineBalancingTask[] = [
  { id: 't_cut_panels', label: 'Cut fabric panels', timeSec: 18, group: 'Cutting', sequenceOrder: 1 },
  { id: 't_trim_edges', label: 'Trim fabric edges', timeSec: 12, group: 'Cutting', sequenceOrder: 2 },
  { id: 't_mark_points', label: 'Mark stitch points', timeSec: 10, group: 'Cutting', sequenceOrder: 3 },
  { id: 't_sew_shoulders', label: 'Sew shoulder seams', timeSec: 24, group: 'Sewing', sequenceOrder: 4 },
  { id: 't_attach_sleeves', label: 'Attach sleeves', timeSec: 28, group: 'Sewing', sequenceOrder: 5 },
  { id: 't_close_sides', label: 'Close side seams', timeSec: 22, group: 'Sewing', sequenceOrder: 6 },
  { id: 't_hem_bottom', label: 'Hem bottom edge', timeSec: 16, group: 'Sewing', sequenceOrder: 7 },
  { id: 't_quality_check', label: 'Inspect shirt quality', timeSec: 12, group: 'Quality Check', sequenceOrder: 8 },
  { id: 't_fold_garment', label: 'Fold garment', timeSec: 14, group: 'Packing', sequenceOrder: 9 },
  { id: 't_pack_label', label: 'Pack and label', timeSec: 16, group: 'Packing', sequenceOrder: 10 },
];
const MIN_CYCLE_TIME_SEC = Math.max(...FIXED_LINE_BALANCING_TASKS.map((task) => task.timeSec));

function sortTasksBySequence(taskList: LineBalancingTask[]) {
  return [...taskList].sort(
    (a, b) => TASK_SEQUENCE.indexOf(a.id) - TASK_SEQUENCE.indexOf(b.id),
  );
}

function getAssignedTaskIds(assignment: Record<string, string[]>) {
  return new Set(Object.values(assignment).flat());
}

function getPrerequisiteIds(taskId: string) {
  const idx = TASK_SEQUENCE.indexOf(taskId);
  if (idx <= 0) return [];
  return TASK_SEQUENCE.slice(0, idx);
}

function getDependentIds(taskId: string) {
  const idx = TASK_SEQUENCE.indexOf(taskId);
  if (idx < 0 || idx >= TASK_SEQUENCE.length - 1) return [];
  return TASK_SEQUENCE.slice(idx + 1);
}

function checkCanAssignTask(
  taskId: string,
  assignedIds: Set<string>,
  taskList: LineBalancingTask[],
): { ok: true } | { ok: false; missing: LineBalancingTask[] } {
  const missing = getPrerequisiteIds(taskId)
    .filter((id) => !assignedIds.has(id))
    .map((id) => taskList.find((t) => t.id === id))
    .filter((t): t is LineBalancingTask => t != null);
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing };
}

function checkCanUnassignTask(
  taskId: string,
  assignedIds: Set<string>,
  taskList: LineBalancingTask[],
): { ok: true } | { ok: false; blockedBy: LineBalancingTask[] } {
  const blockedBy = getDependentIds(taskId)
    .filter((id) => assignedIds.has(id))
    .map((id) => taskList.find((t) => t.id === id))
    .filter((t): t is LineBalancingTask => t != null);
  if (blockedBy.length === 0) return { ok: true };
  return { ok: false, blockedBy };
}

type SequenceAlert =
  | { kind: 'assign'; task: LineBalancingTask; missing: LineBalancingTask[] }
  | { kind: 'unassign'; task: LineBalancingTask; blockedBy: LineBalancingTask[] }
  | { kind: 'guide' };

function useTypingLines(lines: string[], scriptKey: string) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const effectiveLines = useMemo(() => (lines.length > 0 ? lines : ['']), [JSON.stringify(lines)]);

  useEffect(() => {
    setLineIndex(0);
    setCharIndex(0);
    setSkipped(false);
  }, [scriptKey]);

  useEffect(() => {
    if (skipped) return;
    if (lineIndex >= effectiveLines.length) return;
    const line = effectiveLines[lineIndex] ?? '';
    if (charIndex >= line.length) return;
    const t = window.setTimeout(() => setCharIndex((c) => c + 1), TYPE_MS_PER_CHAR);
    return () => window.clearTimeout(t);
  }, [skipped, lineIndex, charIndex, effectiveLines]);

  useEffect(() => {
    if (skipped) return;
    if (lineIndex >= effectiveLines.length) return;
    const line = effectiveLines[lineIndex] ?? '';
    if (charIndex < line.length) return;
    if (lineIndex >= effectiveLines.length - 1) return;
    const t = window.setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, LINE_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [skipped, lineIndex, charIndex, effectiveLines]);

  const skipTyping = () => setSkipped(true);

  const isTypingComplete =
    skipped ||
    (effectiveLines.length > 0 &&
      lineIndex >= effectiveLines.length - 1 &&
      charIndex >= (effectiveLines[effectiveLines.length - 1]?.length ?? 0));

  return { lineIndex, charIndex, skipped, skipTyping, isTypingComplete, effectiveLines };
}

function SpeechBubble({
  children,
  variant = 'default',
  tail = 'right',
}: {
  children: ReactNode;
  variant?: 'default' | 'good' | 'bad';
  tail?: 'left' | 'right';
}) {
  const ring =
    variant === 'good'
      ? 'border-emerald-500/40 shadow-emerald-500/15'
      : variant === 'bad'
        ? 'border-rose-500/40 shadow-rose-500/15'
        : 'border-cyan-500/35 shadow-cyan-500/10';
  const glow =
    variant === 'good'
      ? 'shadow-[0_0_28px_rgba(52,211,153,0.12)]'
      : variant === 'bad'
        ? 'shadow-[0_0_28px_rgba(251,113,133,0.12)]'
        : 'shadow-[0_0_28px_rgba(34,211,238,0.10)]';

  return (
    <div className="relative">
      <div
        className={`relative rounded-2xl border bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 px-4 py-3 ${ring} ${glow}`}
      >
        {children}
      </div>
      {tail === 'right' ? (
        <div
          className="pointer-events-none absolute -right-2 top-9 h-3 w-3 rotate-45 border border-cyan-500/35 bg-slate-900"
          style={{ borderLeftColor: 'transparent', borderBottomColor: 'transparent' }}
        />
      ) : (
        <div
          className="pointer-events-none absolute -left-2 top-9 h-3 w-3 rotate-45 border border-cyan-500/35 bg-slate-900"
          style={{ borderRightColor: 'transparent', borderTopColor: 'transparent' }}
        />
      )}
    </div>
  );
}

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function useAmbientMusic(enabled: boolean, muted: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const audio = new Audio(BG_MUSIC_PUBLIC_PATH);
    audio.loop = true;
    audio.volume = 0.22;
    audioRef.current = audio;

    const tryPlay = () => {
      if (!audioRef.current || startedRef.current) return;
      audioRef.current.play().then(() => { startedRef.current = true; }).catch(() => {});
    };

    tryPlay();
    window.addEventListener('pointerdown', tryPlay, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      startedRef.current = false;
    };
  }, [enabled]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
  }, [muted]);
}

type GameSoundEffectKind = 'station' | 'cutting' | 'sewing' | 'quality' | 'packing' | 'task' | 'timeUp';

function useGameSoundEffects(muted: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContextRef.current = new AudioContextCtor();
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playSound = (kind: GameSoundEffectKind) => {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playTone = (
      type: OscillatorType,
      startOffset: number,
      duration: number,
      startFrequency: number,
      endFrequency: number,
      volume: number,
    ) => {
      const start = now + startOffset;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };

    if (kind === 'station') {
      playTone('triangle', 0, 0.24, 120, 55, 0.18);
      playTone('square', 0.035, 0.06, 520, 420, 0.08);
      return;
    }

    if (kind === 'cutting') {
      playTone('triangle', 0, 0.07, 1180, 520, 0.08);
      playTone('square', 0.085, 0.065, 950, 480, 0.055);
      return;
    }

    if (kind === 'sewing') {
      playTone('sawtooth', 0, 0.3, 120, 105, 0.035);
      for (let i = 0; i < 6; i += 1) {
        playTone('square', i * 0.045, 0.028, 260 + i * 24, 180, 0.045);
      }
      return;
    }

    if (kind === 'quality') {
      playTone('sine', 0, 0.08, 880, 880, 0.07);
      playTone('sine', 0.11, 0.09, 1175, 1175, 0.065);
      return;
    }

    if (kind === 'packing') {
      playTone('sawtooth', 0, 0.22, 620, 250, 0.055);
      playTone('triangle', 0.12, 0.12, 140, 70, 0.075);
      return;
    }

    if (kind === 'timeUp') {
      for (let i = 0; i < 4; i += 1) {
        playTone('sine', i * 0.22, 0.18, 520 + i * 90, 880 + i * 90, 0.12);
        playTone('triangle', i * 0.22 + 0.08, 0.12, 1040, 1040, 0.08);
      }
      return;
    }

    playTone('sine', 0, 0.14, 420, 700, 0.1);
  };

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return playSound;
}

type Phase = 'briefing' | 'stations' | 'cost' | 'assign' | 'results';

type TutorialStep =
  | 'welcome'
  | 'station_select'
  | 'cost'
  | 'assign_intro'
  | 'assign_review'
  | 'results';

type StationSlot = { id: string };

type DragPayload =
  | { kind: 'station' }
  | { kind: 'task'; taskId: string }
  | { kind: 'task-move'; taskId: string; fromStationId: string };

function parseDragPayload(raw: string | undefined): DragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DragPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
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
    const from = payload.fromStationId;
    next[from] = (next[from] ?? []).filter((id) => id !== taskId);
  } else {
    for (const sid of Object.keys(next)) next[sid] = (next[sid] ?? []).filter((id) => id !== taskId);
  }
  const already = new Set(next[stationId] ?? []);
  if (!already.has(taskId)) next[stationId] = [...(next[stationId] ?? []), taskId];
  return next;
}

function loadForStation(next: Record<string, string[]>, stationId: string, taskList: LineBalancingTask[]) {
  const ids = next[stationId] ?? [];
  return sum(ids.map((id) => taskList.find((t) => t.id === id)?.timeSec ?? 0));
}

function formatMMSS(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function getTaskIcon(group?: string) {
  const g = (group ?? '').toLowerCase();
  if (g.includes('cut')) return taskCutting;
  if (g.includes('sew')) return taskSewing;
  if (g.includes('quality')) return taskPacking;
  if (g.includes('pack')) return taskPacking;
  return taskSewing;
}

function getTaskSoundEffect(task?: LineBalancingTask): GameSoundEffectKind {
  const text = `${task?.group ?? ''} ${task?.label ?? ''} ${task?.id ?? ''}`.toLowerCase();
  if (text.includes('cut') || text.includes('trim') || text.includes('mark')) return 'cutting';
  if (text.includes('sew') || text.includes('sleeve') || text.includes('seam') || text.includes('hem')) return 'sewing';
  if (text.includes('quality') || text.includes('inspect') || text.includes('check')) return 'quality';
  if (text.includes('pack') || text.includes('fold') || text.includes('label')) return 'packing';
  return 'task';
}

function buildDefaultLineBalancingScenario(): LineBalancingScenario {
  return {
    cycleTimeSec: DEFAULT_CYCLE_TIME_SEC,
    workstationCostCoins: FIXED_WORKSTATION_COST_COINS,
    tasks: FIXED_LINE_BALANCING_TASKS,
  };
}

function normalizeLineBalancingScenario(raw: LineBalancingScenario | undefined): LineBalancingScenario {
  const def = buildDefaultLineBalancingScenario();
  if (!raw || typeof raw !== 'object') return def;
  const ct = Number(raw.cycleTimeSec);
  const cycleTimeSec =
    Number.isFinite(ct) && ct > 0 ? Math.max(MIN_CYCLE_TIME_SEC, Math.round(ct)) : def.cycleTimeSec;
  return { cycleTimeSec, workstationCostCoins: FIXED_WORKSTATION_COST_COINS, tasks: FIXED_LINE_BALANCING_TASKS };
}

function calcMinStations(totalProcessingTime: number, cycleTime: number) {
  const t = Number.isFinite(totalProcessingTime) ? totalProcessingTime : 0;
  const c = Number.isFinite(cycleTime) && cycleTime > 0 ? cycleTime : 1;
  return Math.ceil(t / c);
}

function lcrAssignment(tasks: LineBalancingTask[], cycleTimeSec: number) {
  // Largest Candidate Rule (no precedence): sort by time desc, pack into stations greedily.
  const sorted = [...tasks].sort((a, b) => b.timeSec - a.timeSec);
  const stations: Array<{ id: string; tasks: LineBalancingTask[]; loadSec: number }> = [];
  for (const t of sorted) {
    let placed = false;
    for (const st of stations) {
      if (st.loadSec + t.timeSec <= cycleTimeSec) {
        st.tasks.push(t);
        st.loadSec += t.timeSec;
        placed = true;
        break;
      }
    }
    if (!placed) {
      stations.push({ id: `opt_${stations.length + 1}`, tasks: [t], loadSec: t.timeSec });
    }
  }
  return stations;
}

function stationAccent(idx: number) {
  const accents = [
    { ring: 'ring-emerald-400/40', border: 'border-emerald-500/40', text: 'text-emerald-200' },
    { ring: 'ring-cyan-400/40', border: 'border-cyan-500/40', text: 'text-cyan-200' },
    { ring: 'ring-amber-400/40', border: 'border-amber-500/40', text: 'text-amber-200' },
    { ring: 'ring-orange-400/40', border: 'border-orange-500/40', text: 'text-orange-200' },
    { ring: 'ring-fuchsia-400/40', border: 'border-fuchsia-500/40', text: 'text-fuchsia-200' },
    { ring: 'ring-sky-400/40', border: 'border-sky-500/40', text: 'text-sky-200' },
  ] as const;
  return accents[idx % accents.length];
}

export function LineBalancingGame({ scenario, lineBalancing, studentEntry, onLeave }: LineBalancingGameProps) {
  const lb = useMemo(() => normalizeLineBalancingScenario(lineBalancing), [lineBalancing]);

  const cycleTimeSec = lb.cycleTimeSec;
  const workstationCostCoins = lb.workstationCostCoins;
  const tasks = lb.tasks;

  const [musicMuted, setMusicMuted] = useState(false);
  useAmbientMusic(true, musicMuted);
  const playSoundEffect = useGameSoundEffects(musicMuted);

  const totalProcessingTimeSec = useMemo(() => sum(tasks.map((t) => t.timeSec)), [tasks]);
  const minStations = useMemo(() => calcMinStations(totalProcessingTimeSec, cycleTimeSec), [totalProcessingTimeSec, cycleTimeSec]);

  const [phase, setPhase] = useState<Phase>('briefing');
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('welcome');

  const [round] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(195);

  const [coins, setCoins] = useState(820);
  const [stations, setStations] = useState<StationSlot[]>([]);
  const [assignment, setAssignment] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; variant: 'good' | 'bad' } | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [sequenceAlert, setSequenceAlert] = useState<SequenceAlert | null>(null);

  const draggedOverRef = useRef<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const timeExpiredNotifiedRef = useRef(false);

  const showFeedback = (text: string, variant: 'good' | 'bad') => {
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    setFeedbackToast({ text, variant });
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackToast(null);
      feedbackTimerRef.current = null;
    }, FEEDBACK_TOAST_MS);
  };
  const assignedTaskIds = useMemo(() => getAssignedTaskIds(assignment), [assignment]);
  const unassignedTasks = useMemo(
    () => sortTasksBySequence(tasks.filter((t) => !assignedTaskIds.has(t.id))),
    [tasks, assignedTaskIds],
  );
  const sequencedTasks = useMemo(() => sortTasksBySequence(tasks), [tasks]);
  const taskAssignReadiness = useMemo(() => {
    const map = new Map<string, { canAssign: boolean; missing: LineBalancingTask[] }>();
    for (const task of tasks) {
      const check = checkCanAssignTask(task.id, assignedTaskIds, tasks);
      map.set(task.id, check.ok ? { canAssign: true, missing: [] } : { canAssign: false, missing: check.missing });
    }
    return map;
  }, [tasks, assignedTaskIds]);

  const stationLoads = useMemo(() => {
    const loads: Record<string, number> = {};
    for (const st of stations) {
      const ids = assignment[st.id] ?? [];
      const load = sum(ids.map((id) => tasks.find((t) => t.id === id)?.timeSec ?? 0));
      loads[st.id] = load;
    }
    return loads;
  }, [stations, assignment, tasks]);

  const anyOverloaded = useMemo(() => stations.some((s) => (stationLoads[s.id] ?? 0) > cycleTimeSec), [stations, stationLoads, cycleTimeSec]);
  const allTasksAssigned = useMemo(() => unassignedTasks.length === 0, [unassignedTasks.length]);

  const efficiency = useMemo(() => {
    if (stations.length <= 0) return 0;
    const e = totalProcessingTimeSec / (stations.length * cycleTimeSec);
    return Number.isFinite(e) ? e : 0;
  }, [stations.length, totalProcessingTimeSec, cycleTimeSec]);

  const idleTimeSec = useMemo(() => {
    if (stations.length <= 0) return 0;
    const idle = stations.length * cycleTimeSec - totalProcessingTimeSec;
    return Number.isFinite(idle) ? Math.max(0, idle) : 0;
  }, [stations.length, cycleTimeSec, totalProcessingTimeSec]);

  const optimal = useMemo(() => lcrAssignment(tasks, cycleTimeSec), [tasks, cycleTimeSec]);
  const optimalStationsCount = optimal.length;

  const canSubmit = useMemo(() => {
    if (phase !== 'assign') return false;
    if (!allTasksAssigned) return false;
    if (anyOverloaded) return false;
    return true;
  }, [phase, allTasksAssigned, anyOverloaded]);

  const girlPose = useMemo(() => {
    if (phase === 'briefing') return girlExplain;
    if (phase === 'stations') return girlThink;
    if (phase === 'cost') return girlExplain;
    if (phase === 'assign') {
      if (feedbackToast?.variant === 'bad') return girlThink;
      if (anyOverloaded) return girlThink;
      if (allTasksAssigned && !anyOverloaded) return girlSuccess;
      return girlPointLeft;
    }
    if (phase === 'results') return girlSuccess;
    return girlIdle;
  }, [phase, anyOverloaded, allTasksAssigned, feedbackToast?.variant]);

  const scriptLines = useMemo(() => {
    switch (tutorialStep) {
      case 'welcome':
        return [
          'Welcome to Virtual Lab.',
          'Today you are running a small T-shirt factory line.',
          'Each shirt moves from cutting to sewing, then finishing and packing.',
          'If sewing takes too long, shirts wait in a pile. If packing has no shirts, that station becomes idle.',
          'That is why line balancing matters: every station should have a fair amount of work.',
          'Cycle Time is the limit for each station. Total Processing Time is all T-shirt work added together.',
          `Workstations = Total Processing Time / Cycle Time  →  ⌈${totalProcessingTimeSec} ÷ ${cycleTimeSec}⌉ = ${minStations}`,
          'Your first move is to build enough workstations, then place the tasks so no station goes over the limit.',
        ];
      case 'station_select':
        return [
          'Start by building the line.',
          'Use the minimum workstation number as your guide.',
          'Too few stations will overload the line. Too many stations cost extra coins and create idle time.',
        ];
      case 'cost':
        return [
          `Each workstation costs ${workstationCostCoins} coins.`,
          'A station can help reduce overload, but an unnecessary station wastes money.',
          'Your goal is not just to finish. Your goal is to balance well.',
        ];
      case 'assign_intro':
        return [
          'Now comes the hands-on factory work.',
          'Tasks follow a fixed shirt flow: cutting → sewing → quality check → packing.',
          'You cannot place a later task until earlier steps are on a workstation.',
          'Remember:',
          `Each workstation load must NOT exceed the cycle time (${cycleTimeSec}s).`,
          'Follow the numbered sequence on the task list.',
        ];
      case 'assign_review':
        return [
          'Take a moment to review your line.',
          'Are all workstations balanced?',
          'Is any station overloaded or underused?',
          'When you’re ready, submit your decision.',
        ];
      case 'results':
        return [
          'Here’s how you did.',
          'If your line isn’t perfectly balanced, don’t worry.',
          'Try adjusting task distribution next round to improve efficiency.',
          'The better you balance your line, the more rewards you earn.',
          'And remember… smart decisions now = more bonuses later!',
        ];
    }
  }, [tutorialStep, cycleTimeSec, workstationCostCoins, totalProcessingTimeSec, minStations]);

  const dialogueScriptKey = `${phase}:${tutorialStep}`;
  const { lineIndex, charIndex, skipped, skipTyping, isTypingComplete, effectiveLines } = useTypingLines(scriptLines, dialogueScriptKey);

  const typingLineFull = skipped || lineIndex >= effectiveLines.length ? '' : (effectiveLines[lineIndex] ?? '');
  const showTypingCaret =
    !skipped && lineIndex < effectiveLines.length && (!isTypingComplete || charIndex < typingLineFull.length);

  useEffect(() => {
    if (phase === 'briefing') return;
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'briefing' || phase === 'results') return;
    if (secondsLeft > 0) return;
    if (timeExpiredNotifiedRef.current) return;

    timeExpiredNotifiedRef.current = true;
    setTimeExpired(true);
    showFeedback("Time's up! Submit your line balance before leaving.", 'bad');
    playSoundEffect('timeUp');

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Virtual Lab — Time is up', {
          body: 'Your round timer has ended. Submit your decisions in the game.',
          tag: 'line-balancing-time-up',
        });
      } catch {
        // Ignore notification errors (e.g. unsupported context).
      }
    }
  }, [phase, secondsLeft, playSoundEffect]);

  const reset = () => {
    setPhase('briefing');
    setTutorialStep('welcome');
    setSecondsLeft(195);
    setCoins(820);
    setStations([]);
    setAssignment({});
    setSubmitted(false);
    setShowAnalytics(false);
    setFeedbackToast(null);
    setTimeExpired(false);
    setSequenceAlert(null);
    timeExpiredNotifiedRef.current = false;
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  };

  const goNextFromBriefing = () => {
    setPhase('stations');
    setTutorialStep('station_select');
  };

  const ensureAssignmentKeys = (nextStations: StationSlot[]) => {
    setAssignment((prev) => {
      const out: Record<string, string[]> = {};
      for (const st of nextStations) out[st.id] = prev[st.id] ?? [];
      return out;
    });
  };

  const addStation = () => {
    const nextId = `st_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const nextStations = [...stations, { id: nextId }];
    setStations(nextStations);
    ensureAssignmentKeys(nextStations);
    setCoins((c) => Math.max(0, c - workstationCostCoins));
    playSoundEffect('station');
  };

  const removeStation = (stationId: string) => {
    const tasksToReturn = assignment[stationId] ?? [];
    const nextStations = stations.filter((s) => s.id !== stationId);
    setStations(nextStations);
    setAssignment((prev) => {
      const copy: Record<string, string[]> = {};
      for (const st of nextStations) copy[st.id] = prev[st.id] ?? [];
      // return tasks to unassigned by simply dropping the station key
      return copy;
    });
    // tasksToReturn automatically become unassigned because they are no longer in assignment
    void tasksToReturn;
  };

  const showSequenceAlert = (alert: SequenceAlert) => {
    setSequenceAlert(alert);
    const msg =
      alert.kind === 'assign'
        ? `Complete earlier steps first: ${alert.missing.map((t) => t.label).join(' → ')}.`
        : `Remove later tasks first: ${alert.blockedBy.map((t) => t.label).join(', ')}.`;
    showFeedback(msg, 'bad');
    playSoundEffect('timeUp');
  };

  const onTaskDropToStation = (stationId: string, payload: DragPayload) => {
    if (payload.kind !== 'task' && payload.kind !== 'task-move') return;
    const task = tasks.find((t) => t.id === payload.taskId);
    if (!task) return;

    if (payload.kind === 'task') {
      const check = checkCanAssignTask(payload.taskId, assignedTaskIds, tasks);
      if (!check.ok) {
        showSequenceAlert({ kind: 'assign', task, missing: check.missing });
        return;
      }
    }

    playSoundEffect(getTaskSoundEffect(task));
    setAssignment((prev) => {
      const next = applyTaskDrop(stations, prev, stationId, payload);
      if (phase === 'assign') {
        const load = loadForStation(next, stationId, tasks);
        const overloaded = load > cycleTimeSec;
        window.queueMicrotask(() =>
          showFeedback(
            overloaded ? 'This workstation is overloaded.' : 'Good! This one is within the cycle time.',
            overloaded ? 'bad' : 'good',
          ),
        );
      }
      return next;
    });
  };

  const onTaskDropToUnassigned = (payload: DragPayload) => {
    if (payload.kind !== 'task-move') return;
    const task = tasks.find((t) => t.id === payload.taskId);
    if (!task) return;

    const check = checkCanUnassignTask(payload.taskId, assignedTaskIds, tasks);
    if (!check.ok) {
      showSequenceAlert({ kind: 'unassign', task, blockedBy: check.blockedBy });
      return;
    }

    playSoundEffect(getTaskSoundEffect(task));
    setAssignment((prev) => {
      const next: Record<string, string[]> = {};
      for (const st of stations) next[st.id] = [...(prev[st.id] ?? [])];
      next[payload.fromStationId] = (next[payload.fromStationId] ?? []).filter((id) => id !== payload.taskId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (studentEntry) {
      saveLabPerformanceResult({
        id: `result_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        classId: studentEntry.classId,
        labId: studentEntry.labId,
        templateId: studentEntry.templateId,
        submittedAt: new Date().toISOString(),
        metrics: {
          efficiencyPct: Math.round(efficiency * 100),
          idleTimeSec,
          stationsUsed: stations.length,
          minStations,
          overloadedStations: stations.filter((s) => (stationLoads[s.id] ?? 0) > cycleTimeSec).length,
          allTasksAssigned,
        },
      });
    }
    setSubmitted(true);
    setPhase('results');
    setTutorialStep('results');
    setTimeExpired(false);
  };

  const proceedToCostPhase = () => {
    setPhase('cost');
    setTutorialStep('cost');
    setShowAnalytics(false);
  };

  const proceedFromCostToAssign = () => {
    setPhase('assign');
    setTutorialStep('assign_intro');
  };

  const showAssignReviewIfReady = () => {
    if (!allTasksAssigned) return;
    if (anyOverloaded) return;
    setTutorialStep('assign_review');
  };

  useEffect(() => {
    if (phase !== 'assign') return;
    showAssignReviewIfReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, allTasksAssigned, anyOverloaded]);

  const balanceLabel = useMemo(() => {
    if (stations.length <= 0) return 'Build your line';
    if (phase === 'stations') return `${stations.length} workstation${stations.length === 1 ? '' : 's'}`;
    if (phase === 'cost') return 'Cost check';
    if (phase === 'assign') {
      if (anyOverloaded) return 'Overloaded';
      if (!allTasksAssigned) return 'Assign tasks';
      return 'Balanced!';
    }
    if (phase === 'results') return 'Submitted';
    return 'Line Balancing';
  }, [stations.length, phase, anyOverloaded, allTasksAssigned]);

  const headerStationImages = useMemo(() => {
    if (stations.length <= 0) return [];
    const imgs = [wsCutting, wsSewing, wsQuality, wsPacking];
    return stations.map((_, idx) => imgs[idx % imgs.length]);
  }, [stations.length, stations]);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={htuLogo}
                    alt="HTU Industrial Virtual Lab"
                    className="h-11 w-auto object-contain"
                  />
                </div>
                <div className="leading-tight">
                  <div className="text-white font-semibold tracking-wide">Virtual Lab</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 -mt-0.5">
                    Industrial simulation
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70">
                  Round <span className="text-slate-200 font-semibold">{round}</span>
                </span>
                <span className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 text-slate-300">
                  Objective: <span className="text-slate-100 font-semibold">Balance {scenario.productName ?? 'Factory'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <motion.div
                animate={
                  timeExpired
                    ? { scale: [1, 1.06, 1], boxShadow: ['0 0 0 rgba(244,63,94,0)', '0 0 24px rgba(244,63,94,0.45)', '0 0 0 rgba(244,63,94,0)'] }
                    : {}
                }
                transition={timeExpired ? { duration: 1.2, repeat: Infinity } : {}}
                className={`bg-slate-900/70 border rounded-xl px-4 py-2 flex items-center gap-2 transition-colors ${
                  timeExpired
                    ? 'border-rose-400 shadow-lg shadow-rose-500/30'
                    : phase !== 'briefing' && secondsLeft <= 30
                      ? 'border-rose-500/50 shadow-lg shadow-rose-500/20 animate-pulse'
                      : 'border-slate-700'
                }`}
              >
                <Timer
                  className={`w-4 h-4 ${
                    timeExpired || (phase !== 'briefing' && secondsLeft <= 30) ? 'text-rose-300' : 'text-slate-300'
                  }`}
                />
                <span
                  className={`font-semibold tabular-nums ${
                    timeExpired || (phase !== 'briefing' && secondsLeft <= 30) ? 'text-rose-200' : 'text-slate-200'
                  }`}
                >
                  {timeExpired ? "TIME'S UP" : formatMMSS(secondsLeft)}
                </span>
              </motion.div>
              <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-300" />
                <span className="text-white font-semibold tabular-nums">{coins}</span>
              </div>
              <button
                onClick={() => setShowAnalytics((v) => !v)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
                  showAnalytics
                    ? 'bg-slate-600 text-white border-slate-500'
                    : 'bg-slate-900/70 text-slate-200 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={reset}
                className="px-3 py-2 rounded-xl bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-slate-700 flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={onLeave}
                className="px-4 py-2 rounded-xl bg-amber-600/90 text-white hover:bg-amber-500 border border-amber-500/50 flex items-center gap-2 font-medium text-sm"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header panel like screenshot */}
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  phase === 'assign' && anyOverloaded
                    ? 'bg-rose-900/20 border-rose-500/40'
                    : phase === 'assign' && allTasksAssigned
                      ? 'bg-emerald-900/20 border-emerald-500/40'
                      : phase === 'cost'
                        ? 'bg-amber-900/15 border-amber-500/35'
                        : 'bg-slate-950/30 border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    phase === 'assign' && anyOverloaded
                      ? 'bg-rose-500/20 text-rose-200'
                      : phase === 'assign' && allTasksAssigned
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : phase === 'cost'
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-white">{balanceLabel}</div>
                  <div className="text-[11px] text-slate-400">
                    Cycle time <span className="text-slate-200 font-semibold tabular-nums">{cycleTimeSec}s</span> • Total processing{' '}
                    <span className="text-slate-200 font-semibold tabular-nums">{totalProcessingTimeSec}s</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block text-xs text-slate-400">
                Objective: <span className="text-slate-200 font-semibold">Balance {scenario.productName ?? 'T‑Shirt'} Factory</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-2">
                <div className="text-[11px] text-slate-400">Minimum workstations</div>
                <div className="text-sm text-slate-200">
                  ⌈{totalProcessingTimeSec} / {cycleTimeSec}⌉ = <span className="font-semibold tabular-nums text-white">{minStations}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`px-5 py-2 rounded-xl font-semibold text-sm border transition-all flex items-center gap-2 ${
                  canSubmit
                    ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                }`}
              >
                SUBMIT DECISIONS
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ribbon */}
          <div className="mt-5 grid grid-cols-6 gap-2 items-center">
            <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-3 flex items-center gap-3">
              <Factory className="w-5 h-5 text-amber-300" />
              <div className="leading-tight">
                <div className="text-xs text-slate-400">Factory</div>
                <div className="text-sm font-semibold text-white tabular-nums">{coins}</div>
              </div>
            </div>
            {headerStationImages.slice(0, 4).map((img, idx) => {
              const acc = stationAccent(idx);
              return (
                <div key={`${idx}_${img}`} className={`rounded-xl border bg-slate-950/30 p-3 ring-1 ${acc.ring} ${acc.border}`}>
                  <div className="flex items-center gap-3">
                    <img src={img} alt="" className="w-10 h-10 object-contain" />
                    <div className="leading-tight">
                      <div className={`text-sm font-semibold ${acc.text}`}>Station {idx + 1}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Load {stations[idx]?.id ? stationLoads[stations[idx]!.id] ?? 0 : 0}s / {cycleTimeSec}s
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-3 flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-300" />
              <div className="leading-tight">
                <div className="text-xs text-slate-400">Workstations</div>
                <div className="text-sm font-semibold text-white tabular-nums">{stations.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {phase === 'briefing' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Before you touch the line</div>
                    <div className="text-lg font-semibold text-white mt-1">Follow the shirt, then fix the delay</div>
                    <p className="text-sm text-slate-300 mt-2 max-w-2xl whitespace-pre-wrap">{scenario.context}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-200">
                    Win condition: no overload
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-cyan-500/30 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-cyan-200 font-semibold text-sm">
                      <Timer className="w-4 h-4" />
                      Check the beat
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Each station gets this much time before the next shirt arrives.
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-amber-200 font-semibold text-sm">
                      <Factory className="w-4 h-4" />
                      Set up the line
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Build enough workstations for all the T-shirt tasks.
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm">
                      <Send className="w-4 h-4" />
                      Balance the work
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Move tasks so there is no pileup and no wasted waiting time.
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cycle time</div>
                    <div className="text-3xl font-bold text-white tabular-nums">{cycleTimeSec}s</div>
                    <div className="mt-1 text-xs text-slate-400">Maximum time allowed per workstation</div>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Total processing time</div>
                    <div className="text-3xl font-bold text-white tabular-nums">{totalProcessingTimeSec}s</div>
                    <div className="mt-1 text-xs text-slate-400">All tasks combined</div>
                  </div>
                </div>

                <div className="mt-4 bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Minimum workstations formula</div>
                  <div className="text-sm text-slate-200 font-mono">
                    Workstations = Total Processing Time / Cycle Time
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    ⌈{totalProcessingTimeSec} / {cycleTimeSec}⌉ = <span className="text-white font-semibold">{minStations}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={goNextFromBriefing}
                    disabled={!isTypingComplete}
                    className={`px-5 py-2.5 rounded-xl font-semibold ${
                      isTypingComplete
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next: Build line
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'stations' && (
              <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">Workstation selection</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Target (minimum): <span className="text-slate-200 font-semibold tabular-nums">{minStations}</span> • Each workstation costs{' '}
                      <span className="text-amber-300 font-semibold tabular-nums">{workstationCostCoins}</span> coins
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'station' } satisfies DragPayload))}
                      className="cursor-grab active:cursor-grabbing select-none rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 flex items-center gap-2"
                      title="Drag to add a workstation"
                    >
                      <img src={stationEmpty} alt="" className="w-8 h-8 object-contain" />
                      <div className="text-xs text-slate-200 font-semibold">Workstation</div>
                    </div>
                    <button
                      type="button"
                      onClick={proceedToCostPhase}
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        stations.length > 0 && isTypingComplete
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                      disabled={stations.length === 0 || !isTypingComplete}
                      title={stations.length === 0 ? 'Add at least 1 workstation' : !isTypingComplete ? 'Finish reading or tap Skip' : 'Continue'}
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: Math.max(3, minStations + 2) }).map((_, idx) => {
                    const st = stations[idx];
                    const acc = stationAccent(idx);
                    return (
                      <div
                        key={idx}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const payload = parseDragPayload(e.dataTransfer.getData('text/plain'));
                          if (payload?.kind === 'station') addStation();
                        }}
                        className={`rounded-2xl border bg-slate-950/30 p-4 ring-1 ${acc.ring} ${acc.border} ${st ? '' : 'border-dashed'}`}
                      >
                        {st ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <img src={headerStationImages[idx % headerStationImages.length] ?? stationEmpty} alt="" className="w-10 h-10 object-contain" />
                              <div className="leading-tight">
                                <div className={`text-sm font-semibold ${acc.text}`}>Station {idx + 1}</div>
                                <div className="text-[11px] text-slate-400">Ready for tasks</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeStation(st.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <img src={stationEmpty} alt="" className="w-10 h-10 object-contain opacity-70" />
                            <div className="text-sm text-slate-400">Drop workstation here</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {phase === 'cost' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-lg font-semibold text-white">Cost & coins</div>
                    <p className="text-sm text-slate-400 mt-1 max-w-xl">
                      You paid for each workstation you placed. Review your spend, then continue to assign tasks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={proceedFromCostToAssign}
                    disabled={!isTypingComplete}
                    className={`px-5 py-2.5 rounded-xl font-semibold shrink-0 ${
                      isTypingComplete
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next: Assign tasks
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wide">Coins left</div>
                    <div className="text-2xl font-bold text-white tabular-nums mt-1 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-300" />
                      {coins}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wide">Workstations built</div>
                    <div className="text-2xl font-bold text-white tabular-nums mt-1">{stations.length}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wide">Spent on stations</div>
                    <div className="text-2xl font-bold text-amber-300 tabular-nums mt-1">
                      {stations.length * workstationCostCoins}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {workstationCostCoins} coins × {stations.length} stations
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 'assign' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Tasks */}
                <div
                  className="lg:col-span-1 bg-slate-900/70 border border-slate-700 rounded-2xl p-5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const payload = parseDragPayload(e.dataTransfer.getData('text/plain'));
                    if (payload) onTaskDropToUnassigned(payload);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">Tasks</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Follow the numbered sequence • Remaining{' '}
                        <span className="text-slate-200 font-semibold tabular-nums">{unassignedTasks.length}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSequenceAlert({ kind: 'guide' })}
                      className="shrink-0 rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900/40 flex items-center gap-1"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      Sequence
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-3 py-2 text-[11px] text-cyan-100/90">
                    Shirt flow: cutting → sewing → quality → packing. Later steps stay locked until earlier ones are on a
                    workstation.
                  </div>

                  <div className="mt-4 space-y-2">
                    {unassignedTasks.map((t) => {
                      const readiness = taskAssignReadiness.get(t.id);
                      const canDrag = readiness?.canAssign ?? false;
                      const step = t.sequenceOrder ?? TASK_SEQUENCE.indexOf(t.id) + 1;
                      return (
                        <div
                          key={t.id}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            if (!canDrag) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({ kind: 'task', taskId: t.id } satisfies DragPayload),
                            );
                          }}
                          onClick={() => {
                            if (canDrag || !readiness?.missing.length) return;
                            showSequenceAlert({ kind: 'assign', task: t, missing: readiness.missing });
                          }}
                          className={`select-none rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                            canDrag
                              ? 'cursor-grab active:cursor-grabbing border-slate-700 bg-slate-950/30 hover:bg-slate-900/60'
                              : 'cursor-not-allowed border-amber-500/35 bg-amber-950/15 opacity-90'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                              canDrag ? 'bg-cyan-500/20 text-cyan-200' : 'bg-amber-500/20 text-amber-200'
                            }`}
                          >
                            {canDrag ? step : <Lock className="w-3.5 h-3.5" />}
                          </div>
                          <img src={getTaskIcon(t.group)} alt="" className="w-9 h-9 object-contain opacity-90" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{t.label}</div>
                            <div className="text-[11px] text-slate-400">{t.group ?? 'Task'}</div>
                            {!canDrag && readiness?.missing.length ? (
                              <div className="text-[10px] text-amber-200/90 mt-0.5 truncate">
                                After: {readiness.missing[readiness.missing.length - 1]?.label}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold text-slate-200 tabular-nums shrink-0">{t.timeSec}s</div>
                        </div>
                      );
                    })}
                    {unassignedTasks.length === 0 && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-3 text-sm text-emerald-200">
                        All tasks assigned. Now check overload and balance.
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    Tip: Drop a task back here to unassign it.
                  </div>
                </div>

                {/* Stations */}
                <div className="lg:col-span-2 bg-slate-900/70 border border-slate-700 rounded-2xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">Assign tasks to workstations</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Sequence order required • each station load ≤{' '}
                        <span className="text-slate-200 font-semibold tabular-nums">{cycleTimeSec}s</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      Efficiency <span className="text-slate-200 font-semibold tabular-nums">{Math.round(efficiency * 100)}%</span> • Idle time{' '}
                      <span className="text-slate-200 font-semibold tabular-nums">{Math.max(0, idleTimeSec)}s</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stations.map((st, idx) => {
                      const acc = stationAccent(idx);
                      const load = stationLoads[st.id] ?? 0;
                      const overloaded = load > cycleTimeSec;
                      const percent = Math.min(100, Math.round((load / cycleTimeSec) * 100));
                      const ids = assignment[st.id] ?? [];
                      return (
                        <div
                          key={st.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            draggedOverRef.current = st.id;
                          }}
                          onDragLeave={() => {
                            if (draggedOverRef.current === st.id) draggedOverRef.current = null;
                          }}
                          onDrop={(e) => {
                            const payload = parseDragPayload(e.dataTransfer.getData('text/plain'));
                            if (!payload) return;
                            onTaskDropToStation(st.id, payload);
                            draggedOverRef.current = null;
                          }}
                          className={`rounded-2xl border bg-slate-950/30 p-4 ring-1 ${acc.ring} ${acc.border} ${
                            overloaded ? 'border-rose-500/60 ring-rose-400/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <img src={headerStationImages[idx % headerStationImages.length] ?? stationEmpty} alt="" className="w-10 h-10 object-contain" />
                              <div className="leading-tight">
                                <div className={`text-sm font-semibold ${acc.text}`}>Workstation {idx + 1}</div>
                                <div className="text-[11px] text-slate-400 tabular-nums">
                                  Load {load}s / {cycleTimeSec}s {overloaded ? <span className="text-rose-300 font-semibold">• overloaded</span> : null}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 tabular-nums">{percent}%</div>
                          </div>

                          <div className="mt-3 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full ${overloaded ? 'bg-rose-500' : 'bg-emerald-500'} `}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>

                          <div className="mt-3 space-y-2 min-h-[52px]">
                            {ids.length === 0 ? (
                              <div className="text-sm text-slate-500">Drop tasks here</div>
                            ) : (
                              ids.map((taskId) => {
                                const t = tasks.find((x) => x.id === taskId);
                                if (!t) return null;
                                return (
                                  <div
                                    key={taskId}
                                    draggable
                                    onDragStart={(e) =>
                                      e.dataTransfer.setData(
                                        'text/plain',
                                        JSON.stringify({ kind: 'task-move', taskId, fromStationId: st.id } satisfies DragPayload),
                                      )
                                    }
                                    className="cursor-grab active:cursor-grabbing select-none rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 flex items-center gap-2"
                                  >
                                    <img src={getTaskIcon(t.group)} alt="" className="w-7 h-7 object-contain" />
                                    <div className="flex-1">
                                      <div className="text-sm font-semibold text-slate-100">{t.label}</div>
                                      <div className="text-[11px] text-slate-400">{t.group ?? 'Task'}</div>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-200 tabular-nums">{t.timeSec}s</div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    {anyOverloaded ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-900/10 p-3 text-sm text-rose-200">
                        This workstation is overloaded. Move a task to another station to bring every load ≤ {cycleTimeSec}s.
                      </div>
                    ) : allTasksAssigned ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-3 text-sm text-emerald-200">
                        Good! All stations are within cycle time. You can submit.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/20 p-3 text-sm text-slate-300">
                        Assign all tasks, then check balance and overload before submitting.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {phase === 'results' && (
              <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-lg font-semibold text-white">Results</div>
                  <div className="text-xs text-slate-400">
                    Submitted <span className="text-slate-200 font-semibold">{submitted ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-400">Efficiency</div>
                    <div className="text-3xl font-bold text-white tabular-nums mt-1">{Math.round(efficiency * 100)}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Efficiency = (sum task times) / (stations × cycle time)</div>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-400">Idle time</div>
                    <div className="text-3xl font-bold text-white tabular-nums mt-1">{Math.max(0, idleTimeSec)}s</div>
                    <div className="text-[11px] text-slate-500 mt-1">Idle = stations × cycle time − total processing time</div>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-400">Stations used</div>
                    <div className="text-3xl font-bold text-white tabular-nums mt-1">{stations.length}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Minimum (theoretical) = {minStations}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-sm font-semibold text-white">Your line</div>
                    <div className="mt-2 space-y-2">
                      {stations.map((st, idx) => {
                        const ids = assignment[st.id] ?? [];
                        const load = stationLoads[st.id] ?? 0;
                        return (
                          <div key={st.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-slate-200">Station {idx + 1}</div>
                              <div className="text-[11px] text-slate-400 tabular-nums">{load}s / {cycleTimeSec}s</div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {ids.map((id) => {
                                const t = tasks.find((x) => x.id === id);
                                if (!t) return null;
                                return <span key={id} className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">{t.label}</span>;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white">Optimal (auto)</div>
                      <div className="text-[11px] text-slate-400">
                        LCR stations: <span className="text-slate-200 font-semibold tabular-nums">{optimalStationsCount}</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {optimal.map((st, idx) => (
                        <div key={st.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-200">Station {idx + 1}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums">{st.loadSec}s / {cycleTimeSec}s</div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {st.tasks.map((t) => (
                              <span key={t.id} className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">{t.label}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">
                      Note: This optimal is a heuristic (Largest Candidate Rule) used for learning feedback.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics drawer */}
            <AnimatePresence>
              {showAnalytics && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-lg font-semibold text-white">Analytics</div>
                    <div className="text-xs text-slate-400">
                      Efficiency = <span className="text-slate-200 font-semibold">Σt / (N × CT)</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Cycle time</div>
                      <div className="text-2xl font-bold text-white tabular-nums mt-1">{cycleTimeSec}s</div>
                      <div className="text-[11px] text-slate-500 mt-1">Max allowed per station</div>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Total processing</div>
                      <div className="text-2xl font-bold text-white tabular-nums mt-1">{totalProcessingTimeSec}s</div>
                      <div className="text-[11px] text-slate-500 mt-1">All tasks combined</div>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Stations</div>
                      <div className="text-2xl font-bold text-white tabular-nums mt-1">{stations.length}</div>
                      <div className="text-[11px] text-slate-500 mt-1">Minimum = {minStations}</div>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                      <div className="text-xs text-slate-400">Efficiency</div>
                      <div className="text-2xl font-bold text-white tabular-nums mt-1">{Math.round(efficiency * 100)}%</div>
                      <div className="text-[11px] text-slate-500 mt-1">Higher is better</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Character + animated dialogue (CSS bubble) */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5 relative overflow-hidden ring-1 ring-cyan-500/10"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-amber-500/5" />
              <div className="relative flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setMusicMuted((m) => !m)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  title={musicMuted ? 'Unmute background music' : 'Mute background music'}
                >
                  {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  Music
                </button>
              </div>
              <div className="relative flex flex-row-reverse items-end gap-3">
                <motion.div
                  key={girlPose}
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="relative w-[130px] sm:w-[150px] shrink-0"
                >
                  <img src={girlPose} alt="" className="w-full h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]" />
                </motion.div>

                <div className="flex-1 min-w-0 pb-1">
                  <SpeechBubble
                    tail="right"
                    variant={feedbackToast?.variant === 'good' ? 'good' : feedbackToast?.variant === 'bad' ? 'bad' : 'default'}
                  >
                    <AnimatePresence mode="wait">
                      {feedbackToast ? (
                        <motion.div
                          key={feedbackToast.text}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                            feedbackToast.variant === 'bad'
                              ? 'bg-rose-500/15 text-rose-100 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/30'
                          }`}
                        >
                          {feedbackToast.text}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="min-h-[5rem] flex flex-col justify-center">
                      {skipped ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.35 }}
                          className="space-y-2"
                        >
                          {effectiveLines.map((line, i) => (
                            <p
                              key={i}
                              className={`text-sm leading-relaxed ${
                                line.includes('Workstations =') ? 'font-mono text-cyan-100/95' : 'text-slate-100'
                              }`}
                            >
                              {line || '\u00A0'}
                            </p>
                          ))}
                        </motion.div>
                      ) : (
                        <AnimatePresence mode="wait">
                          {lineIndex < effectiveLines.length ? (
                            <motion.div
                              key={lineIndex}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className="min-h-[4.75rem] flex items-start"
                            >
                              <p
                                className={`text-sm leading-relaxed ${
                                  typingLineFull.includes('Workstations =')
                                    ? 'font-mono text-cyan-100/95'
                                    : 'text-slate-100'
                                }`}
                              >
                                {typingLineFull.slice(0, charIndex)}
                                {showTypingCaret ? (
                                  <span className="inline-block w-2 animate-pulse text-cyan-300 translate-y-px">▍</span>
                                ) : null}
                              </p>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      )}
                    </div>

                    {!isTypingComplete && (
                      <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider">Typing… tap Skip to show all</div>
                    )}
                  </SpeechBubble>

                  <AnimatePresence>
                    {phase === 'stations' && stations.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-sm font-medium text-emerald-200/95 pl-1"
                      >
                        Nice! Let’s see how you manage your resources next.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative mt-4 flex items-center justify-end gap-2 flex-wrap">
                {!isTypingComplete && (
                  <button
                    type="button"
                    onClick={skipTyping}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm font-medium"
                  >
                    Skip
                  </button>
                )}
                {phase === 'briefing' && (
                  <button
                    type="button"
                    onClick={goNextFromBriefing}
                    disabled={!isTypingComplete}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                      isTypingComplete
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                )}
                {phase === 'stations' && (
                  <button
                    type="button"
                    onClick={proceedToCostPhase}
                    disabled={stations.length === 0 || !isTypingComplete}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                      stations.length > 0 && isTypingComplete
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                )}
                {phase === 'cost' && (
                  <button
                    type="button"
                    onClick={proceedFromCostToAssign}
                    disabled={!isTypingComplete}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                      isTypingComplete
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                )}
                {phase === 'assign' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTutorialStep(allTasksAssigned && !anyOverloaded ? 'assign_review' : 'assign_intro')}
                      className="px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold text-sm"
                    >
                      Hint
                    </button>
                  </>
                )}
                {phase === 'results' && (
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold text-sm"
                  >
                    Play again
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {timeExpired && phase !== 'briefing' && phase !== 'results' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="time-up-title"
            aria-describedby="time-up-desc"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950/40 p-6 shadow-2xl shadow-rose-500/20"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 ring-2 ring-rose-400/50"
              >
                <AlertTriangle className="h-7 w-7 text-rose-300" aria-hidden />
              </motion.div>
              <h2 id="time-up-title" className="text-center text-xl font-bold text-white">
                Time&apos;s up!
              </h2>
              <p id="time-up-desc" className="mt-2 text-center text-sm text-slate-300">
                The round timer has ended. Submit your line balance when you are ready, or keep adjusting your workstations.
              </p>
              <motion.div
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-4 rounded-xl border border-rose-500/30 bg-rose-900/20 px-4 py-3 text-center text-sm font-semibold text-rose-100"
              >
                Timer: 00:00 — submit before you leave the lab
              </motion.div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {canSubmit ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-amber-500 text-slate-950 border border-amber-400 hover:bg-amber-400 flex items-center justify-center gap-2"
                  >
                    Submit now
                    <Send className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTimeExpired(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700"
                >
                  Continue playing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sequenceAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sequence-alert-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-lg rounded-2xl border border-amber-500/45 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 p-6 shadow-2xl shadow-amber-500/15"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/40">
                  <ListOrdered className="h-5 w-5 text-amber-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="sequence-alert-title" className="text-lg font-bold text-white">
                    {sequenceAlert.kind === 'guide'
                      ? 'Correct task sequence'
                      : sequenceAlert.kind === 'assign'
                        ? 'Task locked — wrong order'
                        : 'Cannot remove this task yet'}
                  </h2>
                  {sequenceAlert.kind === 'assign' && sequenceAlert.missing.length > 0 ? (
                    <p className="mt-2 text-sm text-slate-300">
                      <span className="font-semibold text-amber-200">{sequenceAlert.task.label}</span> cannot enter a
                      workstation until these earlier steps are assigned first:
                    </p>
                  ) : sequenceAlert.kind === 'unassign' ? (
                    <p className="mt-2 text-sm text-slate-300">
                      Remove later steps from workstations before taking back{' '}
                      <span className="font-semibold text-amber-200">{sequenceAlert.task.label}</span>:
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">
                      T-shirt tasks follow a fixed factory flow. Assign them in this order (any workstation, but step by
                      step):
                    </p>
                  )}
                </div>
              </div>

              <ol className="mt-4 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950/50 p-3">
                {sequencedTasks.map((t, idx) => {
                  const step = t.sequenceOrder ?? idx + 1;
                  const isAssigned = assignedTaskIds.has(t.id);
                  const isAttempted =
                    sequenceAlert.kind === 'assign' && sequenceAlert.task.id === t.id;
                  const isMissing =
                    sequenceAlert.kind === 'assign' && sequenceAlert.missing.some((m) => m.id === t.id);
                  const isBlocker =
                    sequenceAlert.kind === 'unassign' && sequenceAlert.blockedBy.some((b) => b.id === t.id);
                  return (
                    <li
                      key={t.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                        isAttempted
                          ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/35'
                          : isMissing || isBlocker
                            ? 'bg-rose-500/10 text-rose-100'
                            : isAssigned
                              ? 'bg-emerald-500/10 text-emerald-100'
                              : 'text-slate-300'
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-cyan-300">{step}</span>
                      <span className="flex-1 truncate">{t.label}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-80">
                        {isAssigned ? 'On line' : isMissing ? 'Do first' : isBlocker ? 'Remove first' : t.group}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-3 text-[11px] text-slate-500">
                Line balancing still allows multiple tasks per station — but the shirt must follow cutting → sewing → QC →
                packing.
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSequenceAlert(null)}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-amber-500 text-slate-950 border border-amber-400 hover:bg-amber-400"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

