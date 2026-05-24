import type { ReactNode } from 'react';

/** Jordan flag accent stripe */
export function JordanFlagStripe({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1.5 w-full overflow-hidden rounded-full ${className}`}>
      <div className="flex-[2] bg-black" />
      <div className="flex-1 bg-[#007A3D]" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-[#CE1126]" />
    </div>
  );
}

export function NashamaWorldCupBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#CE1126]/40 bg-black/40 px-3 py-1">
      <span className="text-lg leading-none" aria-hidden>
        ⚽
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CE1126]">Al Nashama</span>
      <span className="text-[10px] font-semibold text-white/90">Jordan · World Cup</span>
    </div>
  );
}

export function NashamaPanel({
  children,
  className = '',
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'urgent' | 'success';
}) {
  const border =
    variant === 'urgent'
      ? 'border-[#CE1126]/45 shadow-[0_0_32px_rgba(206,17,38,0.12)]'
      : variant === 'success'
        ? 'border-[#007A3D]/45 shadow-[0_0_28px_rgba(0,122,61,0.1)]'
        : 'border-slate-700/80';
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br from-slate-900/95 via-slate-950/98 to-black/90 backdrop-blur-sm ${border} ${className}`}
    >
      {children}
    </div>
  );
}
