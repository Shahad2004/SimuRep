import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Clock, LogOut, Shirt, User, Users } from 'lucide-react';
import type { StudentJoinedEntry } from '@/app/types/classes';
import { computeLiveSessionStats } from '@/app/types/liveSession';
import { getOrCreatePlayerId } from '@/app/services/liveSessionSync';
import { useLiveSession } from '@/app/hooks/useLiveSession';
import { JordanFlagStripe, NashamaPanel, NashamaWorldCupBadge } from './NashamaJordanTheme';
import { KahootCharacterPicker, KahootPickCelebration } from './KahootCharacterPicker';
import {
  getStoredWaitingCharacterId,
  getTakenCharacterIds,
  getWaitingRoomCharacter,
  resolvePlayerDisplayLabel,
  setStoredWaitingCharacterId,
  type WaitingRoomCharacterId,
} from './waitingRoomCharacters';
import htuLogo from '@/assets/icons/htu-industrial-virtual-lab.png';

function PlayerAvatar({
  characterId,
  size = 'md',
}: {
  characterId?: WaitingRoomCharacterId;
  size?: 'sm' | 'md' | 'lg';
}) {
  const character = getWaitingRoomCharacter(characterId);
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-11 h-11' : 'w-8 h-8';
  if (!character) {
    return (
      <div
        className={`${dim} rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center shrink-0`}
      >
        <User className={size === 'sm' ? 'w-4 h-4 text-slate-500' : 'w-5 h-5 text-slate-500'} />
      </div>
    );
  }
  return (
    <img
      src={character.imageUrl}
      alt={character.name}
      className={`${dim} rounded-full border-2 border-[#007A3D]/50 object-cover object-top bg-slate-900 shrink-0 shadow-lg shadow-black/30`}
    />
  );
}

export function Level3WaitingRoom({
  entry,
  pin,
  displayName,
  onLeave,
  onLevel3Started,
}: {
  entry: StudentJoinedEntry;
  pin: string;
  displayName: string;
  onLeave: () => void;
  onLevel3Started: () => void;
}) {
  const { session, registerPlayer, updateProgress, claimCharacter } = useLiveSession(entry.labId, pin);
  const [playerId] = useState(() => getOrCreatePlayerId(entry.labId));
  const joinedRef = useRef(false);
  const level3StartedRef = useRef(false);

  const [selectedCharacterId, setSelectedCharacterId] = useState<WaitingRoomCharacterId | null>(() =>
    getStoredWaitingCharacterId(entry.labId),
  );
  const [pickError, setPickError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<WaitingRoomCharacterId | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lobbyReady, setLobbyReady] = useState(() => Boolean(getStoredWaitingCharacterId(entry.labId)));

  const takenIds = useMemo(() => getTakenCharacterIds(session, playerId), [session, playerId]);

  const myPlayer = session?.players[playerId];
  const activeCharacterId = myPlayer?.characterId ?? selectedCharacterId ?? null;
  const activeCharacter = getWaitingRoomCharacter(activeCharacterId ?? undefined);

  // Join waiting room once
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    void registerPlayer({
      playerId,
      displayName: activeCharacter?.name ?? displayName,
      characterId: activeCharacterId ?? undefined,
      progress: 'waiting_l3',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }, [playerId, displayName, registerPlayer, activeCharacter?.name, activeCharacterId]);

  // Heartbeat — keep presence alive
  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      void registerPlayer({
        playerId,
        displayName: activeCharacter?.name ?? displayName,
        characterId: activeCharacterId ?? undefined,
        progress: 'waiting_l3',
        joinedAt: myPlayer?.joinedAt ?? new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    }, 4000);
    return () => window.clearInterval(heartbeat);
  }, [playerId, displayName, registerPlayer, activeCharacterId, activeCharacter?.name, myPlayer?.joinedAt]);

  // Sync character from session (another tab / refresh)
  useEffect(() => {
    if (myPlayer?.characterId) {
      setSelectedCharacterId(myPlayer.characterId);
      setStoredWaitingCharacterId(entry.labId, myPlayer.characterId);
      setLobbyReady(true);
    }
  }, [myPlayer?.characterId, entry.labId]);

  // Instructor starts Level 3
  useEffect(() => {
    if (session?.level3Status !== 'live' || level3StartedRef.current) return;
    if (!activeCharacterId) return;
    level3StartedRef.current = true;
    void updateProgress(playerId, 'level3_active', {
      characterId: activeCharacterId,
      displayName: activeCharacter?.name ?? displayName,
    }).then(() => onLevel3Started());
  }, [
    session?.level3Status,
    playerId,
    updateProgress,
    onLevel3Started,
    activeCharacterId,
    activeCharacter?.name,
    displayName,
  ]);

  const handlePickCharacter = useCallback(
    async (characterId: WaitingRoomCharacterId) => {
      if (pickingId || lobbyReady) return;

      if (takenIds.has(characterId)) {
        setPickError('That player was just taken — pick another one!');
        return;
      }

      setPickError(null);
      setPickingId(characterId);
      const character = getWaitingRoomCharacter(characterId)!;

      const result = await claimCharacter({
        playerId,
        displayName: character.name,
        characterId,
        progress: 'waiting_l3',
        joinedAt: myPlayer?.joinedAt ?? new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });

      setPickingId(null);

      if (!result.ok) {
        setPickError(result.error);
        return;
      }

      setSelectedCharacterId(characterId);
      setStoredWaitingCharacterId(entry.labId, characterId);
      setShowCelebration(true);
    },
    [pickingId, lobbyReady, takenIds, claimCharacter, playerId, myPlayer?.joinedAt, entry.labId],
  );

  const stats = session ? computeLiveSessionStats(session) : null;
  const connected = session ? Object.values(session.players) : [];
  const needsPick = !lobbyReady || !activeCharacterId;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-black via-slate-950 to-[#0a1628]">
      {showCelebration && activeCharacter && (
        <KahootPickCelebration
          characterName={activeCharacter.name}
          imageUrl={activeCharacter.imageUrl}
          onContinue={() => {
            setShowCelebration(false);
            setLobbyReady(true);
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-0 top-0 z-50 shrink-0 border-b border-[#CE1126]/30 bg-black/90 backdrop-blur-md"
      >
        <JordanFlagStripe />
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeCharacter && <PlayerAvatar characterId={activeCharacter.id} size="sm" />}
            <img src={htuLogo} alt="" className="h-10 w-auto" />
            <div>
              <div className="text-white font-bold">
                {needsPick ? 'Choose your player' : 'Waiting Room — Level 3'}
              </div>
              <NashamaWorldCupBadge />
            </div>
          </div>
          <button
            onClick={onLeave}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </motion.div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-[5.5rem]">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {needsPick ? (
            <NashamaPanel className="p-6 md:p-8">
              <KahootCharacterPicker
                takenIds={takenIds}
                selectedId={activeCharacterId}
                pickingId={pickingId}
                lockedIn={lobbyReady}
                error={pickError}
                onPick={(id) => void handlePickCharacter(id)}
              />
            </NashamaPanel>
          ) : (
            <>
              <NashamaPanel variant="urgent" className="p-8 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mx-auto w-20 h-20 rounded-full border-2 border-[#CE1126]/50 bg-[#CE1126]/10 flex items-center justify-center overflow-hidden"
                >
                  {activeCharacter ? (
                    <img
                      src={activeCharacter.imageUrl}
                      alt=""
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <Clock className="w-10 h-10 text-[#CE1126]" />
                  )}
                </motion.div>
                <h1 className="text-2xl font-bold text-white mt-6">
                  Waiting for instructor to start the final challenge…
                </h1>
                {activeCharacter && (
                  <p className="mt-2 text-emerald-300 font-semibold">Playing as {activeCharacter.name}</p>
                )}
                <p className="text-slate-400 mt-3 text-sm max-w-lg mx-auto">
                  Stay on this screen — when your instructor starts the Nashama World Cup challenge, everyone enters
                  together like Kahoot.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#007A3D]/40 bg-[#007A3D]/10 px-4 py-2 text-sm text-emerald-200">
                  <Shirt className="w-4 h-4" />
                  PIN session: <span className="font-mono font-bold">{pin || '—'}</span>
                </div>
              </NashamaPanel>

              {stats && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    [stats.totalJoined, 'Joined lab'],
                    [stats.readyWaiting, 'Ready for L3'],
                    [stats.inLevel2, 'Still in Level 2'],
                    [stats.inLevel1, 'In Level 1'],
                  ].map(([val, lbl]) => (
                    <div
                      key={lbl as string}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center"
                    >
                      <motion.div layout className="text-2xl font-bold text-white tabular-nums">{val}</motion.div>
                      <div className="text-[11px] text-slate-400">{lbl}</div>
                    </div>
                  ))}
                </div>
              )}

              <NashamaPanel className="mt-6 p-5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Squad in waiting room ({connected.filter((p) => p.characterId).length}/{connected.length})
                </div>
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {connected.map((p) => {
                      const label = resolvePlayerDisplayLabel(p);
                      return (
                        <motion.div
                          key={p.playerId}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                            p.playerId === playerId
                              ? 'border-[#007A3D]/50 bg-[#007A3D]/10'
                              : 'border-slate-700 bg-slate-900/50'
                          }`}
                        >
                          <PlayerAvatar characterId={p.characterId} size="sm" />
                          <motion.div layout className="flex-1 min-w-0">
                            <div className="text-slate-200 truncate">
                              {label}
                              {p.playerId === playerId ? ' (you)' : ''}
                            </div>
                            {!p.characterId && (
                              <div className="text-[10px] text-amber-400/90">Picking character…</div>
                            )}
                            {p.characterId && (
                              <div className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready
                              </div>
                            )}
                          </motion.div>
                          <span className="text-[11px] text-slate-500 uppercase shrink-0">
                            {p.progress.replace(/_/g, ' ')}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {connected.length === 0 && (
                    <p className="text-sm text-slate-500">Waiting for classmates to connect…</p>
                  )}
                </div>
              </NashamaPanel>

              <p className="mt-6 text-center text-xs text-slate-500">
                Same PIN as Level 1 & 2 · Do not refresh — you will enter automatically when the instructor starts.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
