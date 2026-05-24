import photo1 from '@/assets/line-balancing/level-3/photo-1.png';
import photo2 from '@/assets/line-balancing/level-3/photo-2.png';
import photo3 from '@/assets/line-balancing/level-3/photo-3.png';
import photo4 from '@/assets/line-balancing/level-3/photo-4.png';
import photo5 from '@/assets/line-balancing/level-3/photo-5.png';

export type CrowdMood = 'bored' | 'hopeful' | 'excited' | 'proud';

export type CinematicKey = 'intro' | 'production' | 'submit';

export const LEVEL3_PHOTO = {
  intro: photo1,
  production: photo2,
  simulating: photo3,
  submit: photo4,
  success: photo5,
} as const;

export const CINEMATIC_DURATION_MS: Record<CinematicKey, number> = {
  intro: 6500,
  production: 4500,
  submit: 3500,
};

export const CROWD_MOOD_META: Record<
  CrowdMood,
  { emoji: string; label: string; color: string; defaultMessage: string }
> = {
  bored: {
    emoji: '😞',
    label: 'Bored',
    color: 'text-rose-300',
    defaultMessage: 'Waiting for Nashama shirts…',
  },
  hopeful: {
    emoji: '🙂',
    label: 'Hopeful',
    color: 'text-amber-300',
    defaultMessage: 'The crowd hears machines starting…',
  },
  excited: {
    emoji: '🎉',
    label: 'Excited',
    color: 'text-emerald-300',
    defaultMessage: 'Fans are cheering your production line!',
  },
  proud: {
    emoji: '🔥',
    label: 'Proud',
    color: 'text-orange-300',
    defaultMessage: 'Jordan is proud — shirts are shipping!',
  },
};

export function computeCheerPct(params: {
  phase: string;
  stationsCount: number;
  minStations: number;
  anyOverloaded: boolean;
  allAssigned: boolean;
  workloadBalancePct: number;
  flowEfficiencyPct: number;
  backtrackingCount: number;
}): number {
  const {
    phase,
    stationsCount,
    minStations,
    anyOverloaded,
    allAssigned,
    workloadBalancePct,
    flowEfficiencyPct,
    backtrackingCount,
  } = params;

  let pct = 0;
  if (phase === 'briefing') return 0;
  if (phase === 'stations') pct = 8;
  if (stationsCount >= minStations) pct += 12;
  if (stationsCount > 0) pct += 10;
  if (!anyOverloaded) pct += 20;
  if (allAssigned) pct += 18;
  if (workloadBalancePct >= 50) pct += 15;
  if (workloadBalancePct >= 70) pct += 10;
  if (flowEfficiencyPct >= 65) pct += 12;
  if (backtrackingCount === 0 && allAssigned) pct += 10;
  if (phase === 'assign' && !anyOverloaded && allAssigned) pct = Math.max(pct, 35);
  if (phase === 'simulate') pct = Math.max(pct, 60);
  if (phase === 'results') pct = 100;
  return Math.min(100, Math.max(0, pct));
}

export function resolveCrowdMood(cheerPct: number, phase: string, cinematic: CinematicKey | null): CrowdMood {
  if (phase === 'results' || cinematic === 'submit') return 'proud';
  if (phase === 'simulate' || cheerPct >= 55) return 'excited';
  if (phase === 'assign' || phase === 'stations' || cinematic === 'production' || cheerPct >= 25) return 'hopeful';
  return 'bored';
}

export function resolveBackgroundPhoto(
  phase: string,
  cinematic: CinematicKey | null,
  cheerPct: number,
): keyof typeof LEVEL3_PHOTO {
  if (cinematic === 'intro') return 'intro';
  if (cinematic === 'production') return 'production';
  if (cinematic === 'submit') return 'submit';
  if (phase === 'results') return 'success';
  if (phase === 'simulate') return 'simulating';
  if (phase === 'assign') {
    if (cheerPct >= 30) return 'simulating';
    return 'production';
  }
  if (phase === 'stations') return 'production';
  return 'production';
}

export function resolveDimLevel(phase: string, cinematic: CinematicKey | null): 'light' | 'medium' | 'heavy' {
  if (cinematic) return 'light';
  if (phase === 'briefing' || phase === 'results') return 'light';
  if (phase === 'simulate') return 'light';
  return 'medium';
}