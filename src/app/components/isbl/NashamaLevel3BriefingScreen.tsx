import { useState } from 'react';
import { ArrowRight, Clock, LayoutGrid, ListOrdered, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { NASHAMA_MIN_STATIONS, NASHAMA_PRECEDENCE_RULES, NASHAMA_TOTAL_PROCESSING_SEC } from './nashamaLevel3';
import type { LineBalancingTask } from '@/app/types/classes';

import { nasahamaGirl, NASAHAMA_GIRL_INTRINSIC } from './nashamaLevel3Assets';

type Props = {
  tasks: LineBalancingTask[];
  cycleTimeSec: number;
  sequencedTasks: LineBalancingTask[];
  onStart: () => void;
  disabled?: boolean;
};

function WaveformIcon() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-end justify-center gap-0.5 rounded-lg border border-[#CE1126]/40 bg-[#CE1126]/10 px-1.5 py-1.5">
      {[3, 6, 4, 7, 5, 8, 4].map((h, i) => (
        <span key={i} className="w-0.5 rounded-full bg-[#CE1126]" style={{ height: `${h * 2}px` }} />
      ))}
    </div>
  );
}

function WorldCupRushCharacter() {
  const { width: imgW, height: imgH } = NASAHAMA_GIRL_INTRINSIC;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative mx-auto w-fit max-w-full shrink-0 lg:mx-0"
    >
      <div className="relative inline-block max-w-full overflow-hidden rounded-2xl border-2 border-[#CE1126]/60 bg-gradient-to-b from-[#CE1126]/40 via-black/95 to-black shadow-[inset_0_8px_20px_rgba(0,0,0,0.5),0_8px_24px_rgba(206,17,38,0.2)]">
        <img
          src={nasahamaGirl}
          width={imgW}
          height={imgH}
          alt="Nashama fan with official shirt box"
          className="block h-auto w-[min(26vw,124px)] max-w-full bg-transparent"
          style={{ aspectRatio: `${imgW} / ${imgH}` }}
          draggable={false}
        />
      </div>
    </motion.figure>
  );
}

export function NashamaLevel3BriefingScreen({
  tasks,
  cycleTimeSec,
  sequencedTasks,
  onStart,
  disabled,
}: Props) {
  const [showAllTasks, setShowAllTasks] = useState(false);

  return (
    <>
      <main className="relative mx-auto flex h-full min-h-0 max-w-6xl flex-col justify-center overflow-hidden px-4 pb-20 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full overflow-hidden rounded-2xl border border-[#CE1126]/35 bg-black/55 p-4 shadow-2xl shadow-black/50 backdrop-blur-md md:p-6 lg:p-7"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(220px,280px)] lg:items-start">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <p className="col-start-2 row-start-1 text-xs font-bold uppercase tracking-[0.28em] text-[#007A3D]">
                Al Nashama — Jordan
              </p>

              <div className="col-start-1 row-start-2 self-start">
                <WorldCupRushCharacter />
              </div>

              <h1 className="col-start-2 row-start-2 mt-2 text-2xl font-bold leading-tight text-white md:text-[1.65rem] lg:text-3xl">
                Nashama T‑Shirt Factory — Urgent Fan Shirt Order
              </h1>

              <p className="col-start-2 row-start-3 mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/95 md:text-[15px]">
                The Jordan national team has qualified for the World Cup. Thousands of official Nashama fan shirts must be
                produced and shipped before the first match. You are the{' '}
                <strong className="text-white">lead industrial engineer</strong> — optimize{' '}
                <strong className="text-[#CE1126]">workstation balancing</strong> and{' '}
                <strong className="text-[#007A3D]">production flow</strong> together.
              </p>
            </div>

            <div className="rounded-xl border border-[#007A3D]/35 bg-black/45 p-4 lg:mt-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#007A3D]">
                <ListOrdered className="h-4 w-4" />
                Precedence Constraints
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-200/90">
                {NASHAMA_PRECEDENCE_RULES.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CE1126]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { value: tasks.length, label: 'Tasks', icon: ListOrdered },
              { value: `${cycleTimeSec}s`, label: 'Cycle Time', icon: Clock },
              { value: NASHAMA_MIN_STATIONS, label: 'Min Stations', icon: LayoutGrid },
              { value: `${NASHAMA_TOTAL_PROCESSING_SEC}s`, label: 'Total Work Content', icon: Timer },
            ].map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-slate-600/60 bg-black/45 px-3 py-3 md:px-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#007A3D]/35 bg-[#007A3D]/10">
                  <Icon className="h-5 w-5 text-[#007A3D]" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums text-white md:text-2xl">{value}</div>
                  <div className="text-[11px] text-slate-400">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAllTasks((v) => !v)}
            className="mt-4 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            {showAllTasks ? 'Hide' : 'View'} full task list ({tasks.length} tasks)
          </button>
          {showAllTasks && (
            <div className="mt-3 grid max-h-40 gap-1.5 overflow-y-auto rounded-xl border border-slate-700/80 bg-black/50 p-3 sm:grid-cols-2">
              {sequencedTasks.map((t, i) => (
                <div
                  key={t.id}
                  className="flex justify-between gap-2 rounded bg-slate-900/50 px-2 py-1 text-[11px] text-slate-300"
                >
                  <span>
                    <span className="text-slate-500">{i + 1}.</span> {t.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-amber-200/90">{t.timeSec}s</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[200px] items-center gap-3 rounded-xl border border-slate-700/70 bg-black/50 px-3 py-2.5">
            <WaveformIcon />
            <p className="text-sm text-slate-200">
              The fans are waiting… <span className="font-semibold text-white">Make them proud!</span>
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-[#007A3D] shadow-[0_0_10px_rgba(0,122,61,0.8)]' : 'bg-slate-600'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A3D] to-emerald-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:opacity-95 disabled:opacity-50 md:px-8"
          >
            Let&apos;s Start Building
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </>
  );
}
