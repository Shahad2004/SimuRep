import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

export type GuideTone = 'cyan' | 'amber' | 'emerald' | 'green' | 'rose';

const BRIGHT_RING: Record<GuideTone, string> = {
  cyan: 'border-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.55)]',
  amber: 'border-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.55)]',
  emerald: 'border-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.55)]',
  green: 'border-lime-300 shadow-[0_0_24px_rgba(163,230,53,0.6)]',
  rose: 'border-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.5)]',
};

const BRIGHT_GLOW: Record<GuideTone, string> = {
  cyan: 'bg-cyan-400/15',
  amber: 'bg-amber-400/15',
  emerald: 'bg-emerald-400/15',
  green: 'bg-lime-400/18',
  rose: 'bg-rose-400/12',
};

const LABEL_STYLE: Record<GuideTone, string> = {
  cyan: 'border-cyan-400/50 bg-slate-950 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.35)]',
  amber: 'border-amber-400/50 bg-slate-950 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
  emerald: 'border-emerald-400/50 bg-slate-950 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)]',
  green: 'border-lime-400/50 bg-slate-950 text-lime-100 shadow-[0_0_18px_rgba(163,230,53,0.4)]',
  rose: 'border-rose-400/50 bg-slate-950 text-rose-100 shadow-[0_0_16px_rgba(251,113,133,0.3)]',
};

/** Bright glow + pulse + optional label & bounce arrow — primary attention cue. */
export function PlayHintPulse({
  active,
  children,
  className = '',
  label,
  tone = 'green',
  showArrow = true,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
  tone?: GuideTone;
  showArrow?: boolean;
}) {
  if (!active) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute -inset-1 rounded-2xl border-2 ${BRIGHT_RING[tone]}`}
        animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.02, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute -inset-2 rounded-2xl ${BRIGHT_GLOW[tone]}`}
        animate={{ opacity: [0.12, 0.35, 0.12] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      />
      {showArrow && label ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 text-lime-300"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-6 w-6 drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]" strokeWidth={3} />
        </motion.div>
      ) : null}
      {label ? (
        <motion.span
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`pointer-events-none absolute -top-10 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide ${LABEL_STYLE[tone]}`}
        >
          {label}
        </motion.span>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Dims non-focused blocks so one area stands out. */
export function GuideFocusWrap({
  focused,
  children,
  className = '',
}: {
  focused: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`transition-all duration-500 ${className} ${
        focused ? 'relative z-20' : 'opacity-[0.28] saturate-[0.65] blur-[0.3px]'
      }`}
    >
      {children}
    </div>
  );
}

/** Top coach bar — one instruction at a time, no answers. */
export function GuideCoachStrip({
  show,
  step,
  totalSteps,
  title,
  children,
  onNext,
  nextLabel = 'Got it — next',
}: {
  show: boolean;
  step: number;
  totalSteps: number;
  title: string;
  children: ReactNode;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 overflow-hidden rounded-xl border-2 border-lime-400/40 bg-gradient-to-r from-lime-950/80 via-slate-900 to-slate-900 shadow-[0_0_28px_rgba(163,230,53,0.2)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <motion.span
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-400 text-sm font-black text-slate-950 shadow-[0_0_14px_rgba(163,230,53,0.7)]"
              >
                {step}
              </motion.span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-lime-300/90">
                  Where to look · {step} of {totalSteps}
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{title}</div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{children}</p>
              </div>
            </div>
            {onNext ? (
              <motion.button
                type="button"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                onClick={onNext}
                className="shrink-0 rounded-xl border-2 border-lime-400 bg-lime-400 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.5)] hover:bg-lime-300"
              >
                {nextLabel}
              </motion.button>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PlayHintBanner({
  step,
  children,
  tone = 'cyan',
}: {
  step: number;
  children: ReactNode;
  tone?: GuideTone;
}) {
  const badge =
    tone === 'amber'
      ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
      : tone === 'emerald' || tone === 'green'
        ? 'bg-lime-400 text-slate-950 shadow-[0_0_12px_rgba(163,230,53,0.5)]'
        : 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.5)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex items-start gap-3 rounded-xl border-2 border-lime-500/30 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100"
    >
      <motion.span
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${badge}`}
      >
        {step}
      </motion.span>
      <p className="leading-snug pt-0.5">{children}</p>
    </motion.div>
  );
}

/** Glowing CTA button wrapper */
export function GuideGlowButton({
  active,
  children,
  label = 'Start here',
}: {
  active: boolean;
  children: ReactNode;
  label?: string;
}) {
  return (
    <PlayHintPulse active={active} label={label} tone="green" showArrow>
      {children}
    </PlayHintPulse>
  );
}
