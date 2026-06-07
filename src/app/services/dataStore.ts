import type {
  InstructorClass,
  Lab,
  LabPerformanceResult,
  StudentJoinedEntry,
} from '@/app/types/classes';
import { apiFetch } from '@/app/services/apiClient';

const GLOBAL_PLAYER_KEY = 'simulab_global_player_id';

/** Stable anonymous browser id (sessionStorage — not game data). */
export function getGlobalPlayerId(): string {
  if (typeof window === 'undefined') return `player_${Date.now()}`;
  let id = window.sessionStorage.getItem(GLOBAL_PLAYER_KEY);
  if (!id) {
    id = `player_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    window.sessionStorage.setItem(GLOBAL_PLAYER_KEY, id);
  }
  return id;
}

export async function fetchInstructorClasses(): Promise<InstructorClass[]> {
  const data = await apiFetch<{ ok: boolean; classes: InstructorClass[] }>('/api/classes');
  return data.classes || [];
}

export async function saveInstructorClasses(classes: InstructorClass[]): Promise<InstructorClass[]> {
  const data = await apiFetch<{ ok: boolean; classes: InstructorClass[] }>('/api/classes', {
    method: 'PUT',
    body: JSON.stringify({ classes }),
  });
  return data.classes || classes;
}

export async function fetchLabByClientId(labId: string): Promise<{ class: InstructorClass; lab: Lab } | null> {
  try {
    const data = await apiFetch<{ ok: boolean; class: InstructorClass; lab: Lab }>(
      `/api/labs/${encodeURIComponent(labId)}`,
    );
    return { class: data.class, lab: data.lab };
  } catch {
    return null;
  }
}

export async function fetchLabByPin(pin: string): Promise<{ class: InstructorClass; lab: Lab } | null> {
  try {
    const data = await apiFetch<{ ok: boolean; class: InstructorClass; lab: Lab }>(
      `/api/labs/pin/${encodeURIComponent(pin.trim())}`,
    );
    return { class: data.class, lab: data.lab };
  } catch {
    return null;
  }
}

export async function joinLabWithPin(
  pin: string,
  playerId: string,
  displayName?: string,
): Promise<{ class: InstructorClass; lab: Lab; entry: StudentJoinedEntry } | null> {
  try {
    const data = await apiFetch<{
      ok: boolean;
      class: InstructorClass;
      lab: Lab;
      entry: StudentJoinedEntry;
    }>('/api/join', {
      method: 'POST',
      body: JSON.stringify({ pin, playerId, displayName }),
    });
    return { class: data.class, lab: data.lab, entry: data.entry };
  } catch {
    return null;
  }
}

export async function fetchStudentJoined(playerId: string): Promise<StudentJoinedEntry[]> {
  const data = await apiFetch<{ ok: boolean; enrollments: StudentJoinedEntry[] }>(
    `/api/enrollments/${encodeURIComponent(playerId)}`,
  );
  return data.enrollments || [];
}

export async function saveStudentJoined(playerId: string, entries: StudentJoinedEntry[]): Promise<void> {
  await apiFetch(`/api/enrollments/${encodeURIComponent(playerId)}`, {
    method: 'PUT',
    body: JSON.stringify({ enrollments: entries }),
  });
}

export async function saveLabPerformanceResult(result: LabPerformanceResult & { playerId?: string; displayName?: string }): Promise<void> {
  await apiFetch(`/api/labs/${encodeURIComponent(result.labId)}/performance`, {
    method: 'POST',
    body: JSON.stringify(result),
  });
}

export async function fetchLabLeaderboard(labId: string) {
  const data = await apiFetch<{ ok: boolean; entries: import('@/app/components/isbl/nashamaLevel3').NashamaLeaderboardEntry[] }>(
    `/api/labs/${encodeURIComponent(labId)}/leaderboard`,
  );
  return data.entries || [];
}

export async function saveLabLeaderboardEntry(
  labId: string,
  entry: import('@/app/components/isbl/nashamaLevel3').NashamaLeaderboardEntry,
  position: number,
): Promise<void> {
  await apiFetch(`/api/labs/${encodeURIComponent(labId)}/leaderboard`, {
    method: 'POST',
    body: JSON.stringify({ ...entry, position }),
  });
}
