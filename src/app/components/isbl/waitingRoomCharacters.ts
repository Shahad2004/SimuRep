import type { LabLiveSession } from '@/app/types/liveSession';

import mohammedImg from '@/assets/line-balancing/waiting-room/mohammed-abu-zreiq.jpg';
import adhamImg from '@/assets/line-balancing/waiting-room/adham-al-qurashi.jpg';
import saadImg from '@/assets/line-balancing/waiting-room/saad-al-rosan.jpg';
import amerImg from '@/assets/line-balancing/waiting-room/amer-jamous.jpg';
import rajaaeImg from '@/assets/line-balancing/waiting-room/rajaae-ayed.png';

export type WaitingRoomCharacterId =
  | 'mohammed_abu_zreiq'
  | 'adham_al_qurashi'
  | 'saad_al_rosan'
  | 'amer_jamous'
  | 'rajaae_ayed';

export interface WaitingRoomCharacter {
  id: WaitingRoomCharacterId;
  name: string;
  imageUrl: string;
}

export const WAITING_ROOM_CHARACTERS: WaitingRoomCharacter[] = [
  { id: 'mohammed_abu_zreiq', name: 'Mohammed Abu Zreiq', imageUrl: mohammedImg },
  { id: 'adham_al_qurashi', name: 'Adham Al Qurashi', imageUrl: adhamImg },
  { id: 'saad_al_rosan', name: 'Saad Al Rosan', imageUrl: saadImg },
  { id: 'amer_jamous', name: 'Amer Jamous', imageUrl: amerImg },
  { id: 'rajaae_ayed', name: 'Rajaae Ayed', imageUrl: rajaaeImg },
];

const CHARACTER_STORAGE_PREFIX = 'simulab_waiting_character_v1_';

export function getWaitingRoomCharacter(id: string | undefined): WaitingRoomCharacter | undefined {
  if (!id) return undefined;
  return WAITING_ROOM_CHARACTERS.find((c) => c.id === id);
}

export function getStoredWaitingCharacterId(labId: string): WaitingRoomCharacterId | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${CHARACTER_STORAGE_PREFIX}${labId}`);
  if (!raw) return null;
  return WAITING_ROOM_CHARACTERS.some((c) => c.id === raw) ? (raw as WaitingRoomCharacterId) : null;
}

export function setStoredWaitingCharacterId(labId: string, characterId: WaitingRoomCharacterId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${CHARACTER_STORAGE_PREFIX}${labId}`, characterId);
}

export function getTakenCharacterIds(
  session: LabLiveSession | null,
  excludePlayerId?: string,
): Set<WaitingRoomCharacterId> {
  const taken = new Set<WaitingRoomCharacterId>();
  if (!session) return taken;
  for (const p of Object.values(session.players)) {
    if (excludePlayerId && p.playerId === excludePlayerId) continue;
    if (p.characterId) taken.add(p.characterId);
  }
  return taken;
}

export function resolvePlayerDisplayLabel(player: {
  displayName: string;
  characterId?: WaitingRoomCharacterId;
}): string {
  return getWaitingRoomCharacter(player.characterId)?.name ?? player.displayName;
}
