import type { LabLivePlayer, LabLiveSession } from '@/app/types/liveSession';
import { createEmptyLiveSession } from '@/app/types/liveSession';
import { apiFetch } from '@/app/services/apiClient';

const PLAYER_ID_PREFIX = 'simulab_player_id_v1_';

export function getOrCreatePlayerId(labId: string): string {
  if (typeof window === 'undefined') return `player_${Date.now()}`;
  const key = `${PLAYER_ID_PREFIX}${labId}`;
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = `player_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

async function fetchSession(labId: string, pin: string): Promise<LabLiveSession> {
  const data = await apiFetch<{ ok: boolean; session: LabLiveSession }>(
    `/api/live-session/${encodeURIComponent(labId)}?pin=${encodeURIComponent(pin)}`,
  );
  return data.session;
}

async function pushSession(session: LabLiveSession): Promise<LabLiveSession> {
  const data = await apiFetch<{ ok: boolean; session: LabLiveSession }>(
    `/api/live-session/${encodeURIComponent(session.labId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(session),
    },
  );
  window.dispatchEvent(new CustomEvent('simulab-live-session', { detail: { labId: session.labId } }));
  return data.session;
}

export async function loadLiveSession(labId: string, pin: string): Promise<LabLiveSession> {
  try {
    return await fetchSession(labId, pin);
  } catch {
    return createEmptyLiveSession(labId, pin);
  }
}

export async function upsertLivePlayer(
  labId: string,
  pin: string,
  player: LabLivePlayer,
): Promise<LabLiveSession> {
  const session = await fetchSession(labId, pin);
  session.players[player.playerId] = { ...player, lastSeenAt: new Date().toISOString() };
  session.updatedAt = new Date().toISOString();
  if (session.level3Status === 'idle' && Object.values(session.players).some((p) => p.progress === 'waiting_l3')) {
    session.level3Status = 'waiting';
  }
  return pushSession(session);
}

export async function patchLivePlayerProgress(
  labId: string,
  pin: string,
  playerId: string,
  patch: Partial<LabLivePlayer>,
): Promise<LabLiveSession> {
  const session = await fetchSession(labId, pin);
  const existing = session.players[playerId];
  if (!existing) {
    session.players[playerId] = {
      playerId,
      displayName: patch.displayName ?? 'Student',
      progress: patch.progress ?? 'waiting_l3',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      ...patch,
    };
  } else {
    session.players[playerId] = {
      ...existing,
      ...patch,
      lastSeenAt: new Date().toISOString(),
    };
  }
  session.updatedAt = new Date().toISOString();
  if (session.level3Status === 'idle' && Object.values(session.players).some((p) => p.progress === 'waiting_l3')) {
    session.level3Status = 'waiting';
  }
  return pushSession(session);
}

export type ClaimCharacterResult =
  | { ok: true; session: LabLiveSession }
  | { ok: false; session: LabLiveSession; error: string };

export async function claimWaitingRoomCharacter(
  labId: string,
  pin: string,
  player: LabLivePlayer,
): Promise<ClaimCharacterResult> {
  const session = await fetchSession(labId, pin);

  if (player.characterId) {
    const conflict = Object.values(session.players).find(
      (p) => p.playerId !== player.playerId && p.characterId === player.characterId,
    );
    if (conflict) {
      const takenName = conflict.displayName;
      return {
        ok: false,
        session,
        error: `This player is already taken${takenName ? ` (${takenName})` : ''}. Pick another one!`,
      };
    }
  }

  const existing = session.players[player.playerId];
  session.players[player.playerId] = {
    ...existing,
    ...player,
    joinedAt: existing?.joinedAt ?? player.joinedAt ?? new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
  session.updatedAt = new Date().toISOString();
  if (session.level3Status === 'idle') {
    session.level3Status = 'waiting';
  }

  const pushed = await pushSession(session);
  return { ok: true, session: pushed };
}

export async function instructorStartLevel3(labId: string, pin: string): Promise<LabLiveSession> {
  const session = await fetchSession(labId, pin);
  session.level3Status = 'live';
  session.level3StartedAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  for (const id of Object.keys(session.players)) {
    if (session.players[id].progress === 'waiting_l3') {
      session.players[id].progress = 'level3_active';
      session.players[id].lastSeenAt = session.updatedAt;
    }
  }
  return pushSession(session);
}

export async function instructorEndLevel3(labId: string, pin: string): Promise<LabLiveSession> {
  const session = await fetchSession(labId, pin);
  session.level3Status = 'ended';
  session.level3EndedAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  return pushSession(session);
}

export function subscribeLiveSession(labId: string, pin: string, onUpdate: (session: LabLiveSession) => void): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const session = await loadLiveSession(labId, pin);
      onUpdate(session);
    } catch {
      /* ignore transient errors */
    }
  };

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ labId: string }>).detail;
    if (detail?.labId === labId) void poll();
  };

  window.addEventListener('simulab-live-session', onCustom);
  void poll();
  const interval = window.setInterval(() => void poll(), 2500);

  return () => {
    active = false;
    window.clearInterval(interval);
    window.removeEventListener('simulab-live-session', onCustom);
  };
}

export function getPlayerCharacterFromSession(
  session: LabLiveSession | null,
  playerId: string,
): import('@/app/components/isbl/waitingRoomCharacters').WaitingRoomCharacterId | null {
  const characterId = session?.players[playerId]?.characterId;
  return characterId ?? null;
}
