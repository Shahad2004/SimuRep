import type { FlowMetrics } from './lineBalancingEngine';

export type FlowPlaybackStep =
  | { kind: 'dwell'; taskIndex: number; station: number }
  | {
      kind: 'move';
      segmentIndex: number;
      from: number;
      to: number;
      backward: boolean;
    };

/** Task dwells + physical moves only (skips same-station hops). Matches metrics & animation. */
export function buildFlowPlaybackPlan(
  stationPath: number[],
  segments: FlowMetrics['segments'],
): FlowPlaybackStep[] {
  const plan: FlowPlaybackStep[] = [];
  for (let i = 0; i < stationPath.length; i++) {
    plan.push({ kind: 'dwell', taskIndex: i, station: stationPath[i] });
    const seg = segments[i];
    if (seg && seg.from !== seg.to) {
      plan.push({
        kind: 'move',
        segmentIndex: i,
        from: seg.from,
        to: seg.to,
        backward: seg.backward,
      });
    }
  }
  return plan;
}

export function flowMetricsSignature(
  flowMetrics: FlowMetrics,
  stationCount: number,
  stationIds?: string[],
): string {
  return [
    stationCount,
    stationIds?.join('|') ?? '',
    flowMetrics.stationPath.join(','),
    flowMetrics.segments.map((s) => `${s.from}-${s.to}-${s.backward ? 1 : 0}`).join(';'),
  ].join('::');
}
