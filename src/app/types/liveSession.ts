import type { NashamaRank } from '@/app/components/isbl/nashamaLevel3';
import type { WaitingRoomCharacterId } from '@/app/components/isbl/waitingRoomCharacters';
import { getWaitingRoomCharacter } from '@/app/components/isbl/waitingRoomCharacters';

/** Student progression within the same PIN lab session (Levels 1–3). */
export type StudentProgressLevel =
  | 'joined'
  | 'level1_active'
  | 'level1_complete'
  | 'level2_active'
  | 'level2_complete'
  | 'waiting_l3'
  | 'level3_active'
  | 'level3_complete';

export type Level3SessionStatus = 'idle' | 'waiting' | 'live' | 'ended';

export interface LabLivePlayer {
  playerId: string;
  displayName: string;
  progress: StudentProgressLevel;
  joinedAt: string;
  lastSeenAt: string;
  /** Nashama player picked in Level 3 waiting room */
  characterId?: WaitingRoomCharacterId;
  /** Live / final Level 3 metrics */
  totalScore?: number;
  balanceEfficiencyPct?: number;
  flowEfficiencyPct?: number;
  idleTimeReductionPct?: number;
  wasteReductionPct?: number;
  workstationScorePct?: number;
  speedScorePct?: number;
  rank?: NashamaRank;
  completionSeconds?: number;
  finishedAt?: string;
}

export interface LabLiveSession {
  labId: string;
  pin: string;
  level3Status: Level3SessionStatus;
  level3StartedAt?: string;
  level3EndedAt?: string;
  updatedAt: string;
  players: Record<string, LabLivePlayer>;
}

export interface LabLiveSessionStats {
  totalJoined: number;
  waitingL3: number;
  inLevel2: number;
  inLevel1: number;
  readyWaiting: number;
  playingL3: number;
  finishedL3: number;
}

export function createEmptyLiveSession(labId: string, pin: string): LabLiveSession {
  return {
    labId,
    pin,
    level3Status: 'idle',
    updatedAt: new Date().toISOString(),
    players: {},
  };
}

export function computeLiveSessionStats(session: LabLiveSession): LabLiveSessionStats {
  const players = Object.values(session.players);
  const totalJoined = players.length;
  let waitingL3 = 0;
  let inLevel2 = 0;
  let inLevel1 = 0;
  let readyWaiting = 0;
  let playingL3 = 0;
  let finishedL3 = 0;

  for (const p of players) {
    switch (p.progress) {
      case 'waiting_l3':
        waitingL3 += 1;
        readyWaiting += 1;
        break;
      case 'level2_active':
      case 'level2_complete':
        inLevel2 += 1;
        break;
      case 'level1_active':
      case 'level1_complete':
        inLevel1 += 1;
        break;
      case 'level3_active':
        playingL3 += 1;
        break;
      case 'level3_complete':
        finishedL3 += 1;
        break;
      default:
        break;
    }
  }

  return {
    totalJoined,
    waitingL3,
    inLevel2,
    inLevel1,
    readyWaiting,
    playingL3,
    finishedL3,
  };
}

export function sortLiveLeaderboard(session: LabLiveSession): LabLivePlayer[] {
  return Object.values(session.players)
    .filter((p) => p.totalScore != null && (p.progress === 'level3_active' || p.progress === 'level3_complete'))
    .sort((a, b) => {
      const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.finishedAt ?? '').localeCompare(b.finishedAt ?? '');
    });
}

/** Map live session players to Nashama leaderboard rows for Kahoot UI. */
export function liveSessionToLeaderboardEntries(
  session: LabLiveSession | null,
): import('@/app/components/isbl/nashamaLevel3').NashamaLeaderboardEntry[] {
  if (!session) return [];
  return sortLiveLeaderboard(session).map((p) => ({
    id: p.playerId,
    playerName: getWaitingRoomCharacter(p.characterId)?.name ?? p.displayName,
    characterId: p.characterId,
    totalScore: p.totalScore ?? 0,
    balanceEfficiencyPct: p.balanceEfficiencyPct ?? 0,
    flowEfficiencyPct: p.flowEfficiencyPct ?? 0,
    wasteReductionPct: p.wasteReductionPct ?? 0,
    completionSeconds: p.completionSeconds ?? 0,
    rank: p.rank ?? 'Factory Trainee',
    submittedAt: p.finishedAt ?? p.lastSeenAt,
    labId: session.labId,
  }));
}
