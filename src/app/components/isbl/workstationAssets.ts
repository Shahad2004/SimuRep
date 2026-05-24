import wsCutting from '@/assets/line-balancing/workstations/ws_cutting.png?url';
import wsPacking from '@/assets/line-balancing/workstations/ws_packing.png?url';
import wsSewing from '@/assets/line-balancing/workstations/ws_sewing.png?url';
import wst5 from '@/assets/line-balancing/workstations/wst-5.png?url';
import wst6 from '@/assets/line-balancing/workstations/wst-6.png?url';
import wst7 from '@/assets/line-balancing/workstations/wst-7.png?url';

/**
 * Workstation art in drag order (Level 3):
 * 1 cutting · 2 sewing · 3 wst-5 (replaces old quality slot) · 4 packing · 5 wst-6 · 6 wst-7
 */
export const WORKSTATION_TYPE_IMAGES = [wsCutting, wsSewing, wst5, wsPacking, wst6, wst7] as const;

export const WORKSTATION_TYPE_COUNT = WORKSTATION_TYPE_IMAGES.length;

export type WorkstationTypeIndex = number;

export function getWorkstationImageUrl(typeIndex: number): string {
  if (typeIndex < 0 || typeIndex >= WORKSTATION_TYPE_COUNT) {
    return WORKSTATION_TYPE_IMAGES[0];
  }
  return WORKSTATION_TYPE_IMAGES[typeIndex];
}

/** First workstation type not already placed on the line. */
export function nextAvailableWorkstationType(usedTypeIndices: readonly number[]): number | null {
  const used = new Set(usedTypeIndices);
  for (let i = 0; i < WORKSTATION_TYPE_COUNT; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/** Pick workstation art by slot/order (Level 1 — cycles when more stations than images). */
export function workstationTypeIndexForOrder(order: number): WorkstationTypeIndex {
  const len = WORKSTATION_TYPE_COUNT;
  return ((order % len) + len) % len;
}

/** Task group → preferred workstation image (flow panel, comparison). */
export function getWorkstationImageForTaskGroup(group?: string): string {
  const g = (group ?? '').toLowerCase();
  if (g.includes('cut') || g.includes('fabric')) return wsCutting;
  if (g.includes('sew') || g.includes('print') || g.includes('assembl')) return wsSewing;
  if (g.includes('quality') || g.includes('finish')) return wst5;
  if (g.includes('pack')) return wsPacking;
  return wsSewing;
}
