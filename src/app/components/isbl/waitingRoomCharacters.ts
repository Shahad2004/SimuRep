import type { LabLiveSession } from '@/app/types/liveSession';

const waitingRoomImages = import.meta.glob<string>(
  '@/assets/line-balancing/waiting-room/*.{png,jpg,jpeg}',
  { eager: true, import: 'default' },
);

function resolveWaitingRoomImage(file: string): string {
  const normalized = file.toLowerCase();
  for (const [path, url] of Object.entries(waitingRoomImages)) {
    if (path.split('/').pop()?.toLowerCase() === normalized) return url;
  }
  throw new Error(`Missing waiting room image: ${file}`);
}

const WAITING_ROOM_ROSTER = [
  { id: 'adham_al_qurashi', name: 'Adham Al Qurashi', file: 'adham-al-qurashi.jpg' },
  { id: 'abdullah_naseeb', name: 'Abdullah Naseeb', file: 'Abdullah-naseeb.png' },
  { id: 'ali_alwan', name: 'Ali Alwan', file: 'Ali-alwan.png' },
  { id: 'ali_azaizeh', name: 'Ali Azaizeh', file: 'ali-azaizeh.png' },
  { id: 'ali_hajabi', name: 'Ali Hajabi', file: 'ali-hajabi.png' },
  { id: 'amer_jamous', name: 'Amer Jamous', file: 'amer-jamous.png' },
  { id: 'ehsan_haddad', name: 'Ehsan Haddad', file: 'ehsan-haddad.png' },
  { id: 'esam_al_sameeri', name: 'Esam Al Sameeri', file: 'esam-al-sameeri.png' },
  { id: 'jamal_al_salami', name: 'Jamal Al Salami', file: 'Jamal-al-salami.jpg' },
  { id: 'mahmoud_mardi', name: 'Mahmoud Mardi', file: 'mahmoud-mardi.png' },
  { id: 'mohammed_abu_hasheesh', name: 'Mohammed Abu Hasheesh', file: 'mohammed-abu-hasheesh.png' },
  { id: 'mohammed_abu_zreiq', name: 'Mohammed Abu Zreiq', file: 'mohammed-abu-zreiq.jpg' },
  { id: 'mohanad_abu_taha', name: 'Mohanad Abu Taha', file: 'mohanad-abu-taha.png' },
  { id: 'mousa_al_tamari', name: 'Mousa Al Tamari', file: 'Mousa-al-tamari.png' },
  { id: 'nizar_al_rashdan', name: 'Nizar Al Rashdan', file: 'nizar-al-rashdan.png' },
  { id: 'noor_bani_atiyyeh', name: 'Noor Bani Atiyyeh', file: 'noor-bani-atiyyeh.png' },
  { id: 'odeh_fakhoury', name: 'Odeh Fakhoury', file: 'Odeh-fakhoury.png' },
  { id: 'saad_al_rosan', name: 'Saad Al Rosan', file: 'saad-al-rosan.jpg' },
  { id: 'yazan_al_arab', name: 'Yazan Al Arab', file: 'Yazan-al-arab.png' },
  { id: 'yazan_al_naimat', name: 'Yazan Al Naimat', file: 'Yazan-al-naimat.png' },
  { id: 'yazeed_abu_laila', name: 'Yazeed Abu Laila', file: 'Yazeed-abu-laila.png' },
] as const;

export type WaitingRoomCharacterId = (typeof WAITING_ROOM_ROSTER)[number]['id'];

export interface WaitingRoomCharacter {
  id: WaitingRoomCharacterId;
  name: string;
  imageUrl: string;
}

export const WAITING_ROOM_CHARACTERS: WaitingRoomCharacter[] = WAITING_ROOM_ROSTER.map((player) => ({
  id: player.id,
  name: player.name,
  imageUrl: resolveWaitingRoomImage(player.file),
}));

export function getWaitingRoomCharacter(id: string | undefined): WaitingRoomCharacter | undefined {
  if (!id) return undefined;
  return WAITING_ROOM_CHARACTERS.find((c) => c.id === id);
}

export function getStoredWaitingCharacterId(
  _labId: string,
  session?: import('@/app/types/liveSession').LabLiveSession | null,
  playerId?: string,
): WaitingRoomCharacterId | null {
  if (session && playerId) {
    const fromSession = session.players[playerId]?.characterId;
    if (fromSession && WAITING_ROOM_CHARACTERS.some((c) => c.id === fromSession)) {
      return fromSession as WaitingRoomCharacterId;
    }
  }
  return null;
}

/** @deprecated Character is stored on the live session via API */
export function setStoredWaitingCharacterId(_labId: string, _characterId: WaitingRoomCharacterId): void {
  /* no-op — character is persisted via claimWaitingRoomCharacter */
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
