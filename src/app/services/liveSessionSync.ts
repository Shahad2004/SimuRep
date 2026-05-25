import type { LabLivePlayer, LabLiveSession } from '@/app/types/liveSession';
import { createEmptyLiveSession } from '@/app/types/liveSession';

const LOCAL_SESSION_PREFIX = 'simulab_live_session_v1_';
const PLAYER_ID_PREFIX = 'simulab_player_id_v1_';

function localKey(labId: string) {
  return `${LOCAL_SESSION_PREFIX}${labId}`;
}

export function getOrCreatePlayerId(labId: string): string {
  if (typeof window === 'undefined') return `player_${Date.now()}`;
  const key = `${PLAYER_ID_PREFIX}${labId}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `player_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

function readLocalSession(labId: string, pin: string): LabLiveSession {
  if (typeof window === 'undefined') return createEmptyLiveSession(labId, pin);
  try {
    const raw = window.localStorage.getItem(localKey(labId));
    if (raw) {
      const parsed = JSON.parse(raw) as LabLiveSession;
      if (parsed?.labId === labId) return parsed;
    }
  } catch {
    /* ignore */
  }
  return createEmptyLiveSession(labId, pin);
}

function writeLocalSession(session: LabLiveSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(session.labId), JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('simulab-live-session', { detail: { labId: session.labId } }));
}

async function fetchSession(labId: string, pin: string): Promise<LabLiveSession> {
  try {
    const res = await fetch(`/api/live-session/${encodeURIComponent(labId)}?pin=${encodeURIComponent(pin)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as LabLiveSession;
      writeLocalSession(data);
      return data;
    }
  } catch {
    /* API unavailable — classroom may be offline */
  }
  return readLocalSession(labId, pin);
}

async function pushSession(session: LabLiveSession): Promise<LabLiveSession> {
  writeLocalSession(session);
  try {
    const res = await fetch(`/api/live-session/${encodeURIComponent(session.labId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (res.ok) {
      return (await res.json()) as LabLiveSession;
    }
  } catch {
    /* keep local copy */
  }
  return session;
}

export async function loadLiveSession(labId: string, pin: string): Promise<LabLiveSession> {
  return fetchSession(labId, pin);
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

/** Kahoot-style atomic character claim — fails if another student already picked it. */
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

export function subscribeLiveSession(labId: string, onUpdate: (session: LabLiveSession) => void): () => void {
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ labId: string }>).detail;
    if (detail?.labId === labId) {
      const pin = readLocalSession(labId, '').pin;
      void loadLiveSession(labId, pin || '').then(onUpdate);
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === localKey(labId) && e.newValue) {
      try {
        onUpdate(JSON.parse(e.newValue) as LabLiveSession);
      } catch {
        /* ignore */
      }
    }
  };

  window.addEventListener('simulab-live-session', onCustom);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('simulab-live-session', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
