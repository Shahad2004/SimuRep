import { Timer } from 'lucide-react';

type CycleTimeBannerProps = {
  cycleTimeSec: number;
  /** e.g. "Level 1 & 2" or "Level 3" */
  levelLabel?: string;
  className?: string;
  size?: 'md' | 'lg';
};

export function CycleTimeBanner({
  cycleTimeSec,
  levelLabel,
  className = '',
  size = 'md',
}: CycleTimeBannerProps) {
  const large = size === 'lg';

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border border-cyan-400/55 bg-gradient-to-r from-cyan-950/95 via-slate-950/90 to-slate-950/95 shadow-[0_0_28px_rgba(34,211,238,0.18)] ring-1 ring-cyan-500/20 ${
        large ? 'px-5 py-3' : 'px-3 py-2'
      } ${className}`}
      role="status"
      aria-label={`Cycle time ${cycleTimeSec} seconds per workstation`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-cyan-500/25 ${
          large ? 'h-11 w-11' : 'h-9 w-9'
        }`}
      >
        <Timer className={large ? 'h-5 w-5 text-cyan-300' : 'h-4 w-4 text-cyan-300'} />
      </div>
      <div className="min-w-0 leading-tight">
        {levelLabel ? (
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-400/95">{levelLabel}</div>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className={`font-black tabular-nums text-white ${large ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
            {cycleTimeSec}
          </span>
          <span className={`font-semibold text-cyan-100 ${large ? 'text-base' : 'text-sm'}`}>s</span>
          <span className={`text-slate-300 ${large ? 'text-sm' : 'text-xs'}`}>cycle time</span>
        </div>
        <p className={`mt-0.5 text-slate-400 ${large ? 'text-xs' : 'text-[10px]'}`}>
          Instructor target · no station may exceed this
        </p>
      </div>
    </div>
  );
}
