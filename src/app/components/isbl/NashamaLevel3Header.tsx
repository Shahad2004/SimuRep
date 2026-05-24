import { Coins, HelpCircle, LogOut, Star, Timer } from 'lucide-react';
import nashamaLogo from '@/assets/line-balancing/level-3/nashama logo.png';

function formatMMSS(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Top padding for scrollable content below the fixed Nashama header (large center logo). */
export const NASHAMA_HEADER_OFFSET_CLASS = 'pt-[6.5rem] md:pt-[8rem] lg:pt-[9.75rem]';

type Props = {
  secondsLeft: number;
  coins: number;
  onLeave: () => void;
  showHint?: boolean;
  onHint?: () => void;
  variant?: 'briefing' | 'gameplay';
};

export function NashamaLevel3Header({
  secondsLeft,
  coins,
  onLeave,
  showHint,
  onHint,
  variant = 'gameplay',
}: Props) {
  const isBriefing = variant === 'briefing';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 w-full shrink-0 overflow-hidden border-b backdrop-blur-md ${
        isBriefing ? 'border-white/10 bg-black/70' : 'border-[#CE1126]/30 bg-black/85'
      }`}
    >
      <div
        className={`mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-2 px-3 md:gap-3 md:px-5 ${
          isBriefing ? 'py-1.5 md:py-2' : 'py-2 md:py-2.5'
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#CE1126]/50 bg-black/70 px-2 py-1 md:px-2.5 md:py-1.5">
            <Star className="h-3 w-3 fill-[#CE1126] text-[#CE1126] md:h-3.5 md:w-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#CE1126] md:text-[10px]">Level 3</span>
          </div>
          <span className="hidden truncate text-xs font-semibold text-white/90 sm:inline md:text-sm">
            Nashama World Cup
          </span>
        </div>

        <div className="flex min-w-0 max-w-full items-center justify-center overflow-hidden px-1">
          <img
            src={nashamaLogo}
            alt="Al Nashama Jordan"
            className="block h-[5.5rem] w-auto max-w-full object-contain object-center drop-shadow-[0_6px_22px_rgba(0,0,0,0.7)] md:h-[7.4rem] lg:h-[9rem]"
          />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1 md:gap-1.5">
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/35 bg-black/55 px-2 py-1 md:gap-1.5 md:px-2.5 md:py-1.5">
            <Timer className={`h-3.5 w-3.5 shrink-0 ${secondsLeft < 60 ? 'animate-pulse text-rose-400' : 'text-amber-300'}`} />
            <span className="text-xs font-bold tabular-nums text-white md:text-sm">{formatMMSS(secondsLeft)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-600/80 bg-black/55 px-2 py-1 md:gap-1.5 md:px-2.5 md:py-1.5">
            <Coins className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="text-xs font-semibold tabular-nums text-white md:text-sm">{coins}</span>
          </div>
          {showHint && onHint && (
            <button
              type="button"
              onClick={onHint}
              className="hidden shrink-0 items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-900/50 sm:flex md:px-2.5 md:py-1.5"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Hint
            </button>
          )}
          <button
            type="button"
            onClick={onLeave}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#CE1126] px-2 py-1 text-xs font-semibold text-white hover:bg-[#a80e1e] md:px-2.5 md:py-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
