import { motion } from 'motion/react';
import type { CrowdMood } from './nashamaLevel3Cinematic';
import { CROWD_MOOD_META } from './nashamaLevel3Cinematic';

export function NashamaCrowdMoodMeter({
  mood,
  cheerPct,
  message,
}: {
  mood: CrowdMood;
  cheerPct: number;
  message?: string;
}) {
  const meta = CROWD_MOOD_META[mood];
  const displayMessage = message ?? meta.defaultMessage;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-slate-700/80 bg-black/75 backdrop-blur-md p-4 shadow-xl shadow-black/40"
    >
      <div className="text-sm font-bold text-white tracking-wide">Crowd Mood</div>

      <div className="mt-3 flex items-center gap-2">
        <motion.span
          key={mood}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl leading-none"
          aria-hidden
        >
          {meta.emoji}
        </motion.span>
        <motion.span
          key={`${mood}-label`}
          initial={{ x: -6, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`text-lg font-bold ${meta.color}`}
        >
          {meta.label}
        </motion.span>
      </div>

      <p className="mt-2 text-xs text-slate-300 leading-relaxed min-h-[2.5rem]">{displayMessage}</p>

      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Cheer meter</span>
          <span className="tabular-nums text-slate-300">{Math.round(cheerPct)}%</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-800">
          <div
            className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"
            aria-hidden
          />
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] rounded-full"
            animate={{ left: `calc(${Math.min(100, Math.max(0, cheerPct))}% - 2px)` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-wider text-slate-600">
          <span>Bored</span>
          <span>Hopeful</span>
          <span>Excited</span>
          <span>Proud</span>
        </div>
      </div>
    </motion.div>
  );
}
