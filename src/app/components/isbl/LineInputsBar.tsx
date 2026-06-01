import { useMemo, useState } from 'react';
import { ChevronDown, Shirt, Timer } from 'lucide-react';
import type { LineBalancingTask } from '@/app/types/classes';

type LineInputsBarProps = {
  cycleTimeSec: number;
  totalProcessingTimeSec: number;
  tasks: LineBalancingTask[];
  levelLabel?: string;
  className?: string;
};

export function LineInputsBar({
  cycleTimeSec,
  totalProcessingTimeSec,
  tasks,
  levelLabel = 'Level 1',
  className = '',
}: LineInputsBarProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)),
    [tasks],
  );

  return (
    <section
      className={`w-full space-y-2 ${className}`}
      aria-label="Line inputs: cycle time and total processing time"
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {levelLabel} · Line inputs
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="inline-flex items-center gap-2.5 rounded-xl border border-cyan-400/55 bg-gradient-to-r from-cyan-950/95 via-slate-950/90 to-slate-950/95 px-5 py-3 shadow-[0_0_28px_rgba(34,211,238,0.18)] ring-1 ring-cyan-500/20"
          role="status"
          aria-label={`Cycle time ${cycleTimeSec} seconds per workstation`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500/25">
            <Timer className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-400/95">Cycle time</div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="text-3xl font-black tabular-nums text-white md:text-4xl">{cycleTimeSec}</span>
              <span className="text-base font-semibold text-cyan-100">s</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">Instructor target · max per workstation</p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-950/90 via-slate-950/90 to-slate-950/95 px-5 py-3 shadow-[0_0_28px_rgba(251,191,36,0.12)] ring-1 ring-amber-500/20"
          role="status"
          aria-label={`Total processing time ${totalProcessingTimeSec} seconds`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/25">
            <Shirt className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400/95">
              Total processing time
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="text-3xl font-black tabular-nums text-white md:text-4xl">{totalProcessingTimeSec}</span>
              <span className="text-base font-semibold text-amber-100">s</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Sum of all task times · {sortedTasks.length} work elements on one shirt
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40">
        <button
          type="button"
          onClick={() => setBreakdownOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-medium text-slate-300 hover:bg-slate-900/50 transition-colors rounded-xl"
          aria-expanded={breakdownOpen}
        >
          <span>How we get {totalProcessingTimeSec}s</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {breakdownOpen && (
          <ul className="border-t border-slate-800 px-4 py-3 space-y-1.5 max-h-48 overflow-y-auto">
            {sortedTasks.map((t, idx) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400 tabular-nums shrink-0 w-4">{idx + 1}.</span>
                <span className="text-slate-200 truncate flex-1">{t.label}</span>
                <span className="text-amber-200/90 font-semibold tabular-nums shrink-0">{t.timeSec}s</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2 mt-2 text-xs font-semibold">
              <span className="text-slate-300">Total</span>
              <span className="text-amber-200 tabular-nums">{totalProcessingTimeSec}s</span>
            </li>
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-500 max-w-2xl">
        Use both numbers in the workstation formula: total processing time ÷ cycle time → round up for how many
        workstations you need.
      </p>
    </section>
  );
}
