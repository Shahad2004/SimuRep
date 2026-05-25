import { useMemo } from 'react';
import { Play, Square, Users, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import type { Lab } from '@/app/types/classes';
import { computeLiveSessionStats, sortLiveLeaderboard } from '@/app/types/liveSession';
import { useLiveSession } from '@/app/hooks/useLiveSession';
import { instructorEndLevel3, instructorStartLevel3 } from '@/app/services/liveSessionSync';
import { getWaitingRoomCharacter, resolvePlayerDisplayLabel } from './waitingRoomCharacters';

export function InstructorLiveSessionPanel({ lab }: { lab: Lab }) {
  const { session, refresh } = useLiveSession(lab.id, lab.pin);
  const stats = session ? computeLiveSessionStats(session) : null;
  const leaderboard = session ? sortLiveLeaderboard(session) : [];

  const statusLabel = useMemo(() => {
    if (!session) return 'Loading…';
    switch (session.level3Status) {
      case 'idle':
        return 'Not started';
      case 'waiting':
        return 'Waiting room open';
      case 'live':
        return 'LIVE — Final challenge';
      case 'ended':
        return 'Session ended';
    }
  }, [session]);

  const handleStart = async () => {
    await instructorStartLevel3(lab.id, lab.pin);
    await refresh();
  };

  const handleEnd = async () => {
    await instructorEndLevel3(lab.id, lab.pin);
    await refresh();
  };

  if (lab.templateId !== 'line-balancing') return null;

  return (
    <div className="rounded-2xl border border-[#CE1126]/35 bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#CE1126]">Level 3 multiplayer</div>
          <div className="text-lg font-semibold text-white mt-1">Nashama World Cup — same PIN session</div>
          <div className="text-sm text-slate-400 mt-1">
            PIN <span className="font-mono text-white font-bold">{lab.pin}</span> · {statusLabel}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {session?.level3Status !== 'live' && session?.level3Status !== 'ended' && (
            <button
              type="button"
              onClick={() => void handleStart()}
              className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start final challenge
            </button>
          )}
          {session?.level3Status === 'live' && (
            <button
              type="button"
              onClick={() => void handleEnd()}
              className="px-4 py-2 rounded-xl bg-[#CE1126] hover:bg-rose-700 text-white font-bold text-sm flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              End session
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            [stats.totalJoined, 'Joined PIN', 'text-white'],
            [stats.readyWaiting, 'Waiting for L3', 'text-emerald-300'],
            [stats.inLevel2, 'Still Level 2', 'text-amber-300'],
            [stats.inLevel1, 'Still Level 1', 'text-slate-300'],
            [stats.playingL3, 'Playing L3', 'text-cyan-300'],
            [stats.finishedL3, 'Finished', 'text-amber-200'],
          ].map(([val, lbl, color]) => (
            <div key={lbl as string} className="rounded-xl border border-slate-700 bg-black/40 p-3 text-center">
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{val}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{lbl}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="w-4 h-4 text-cyan-400" />
            Live roster
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {session &&
              Object.values(session.players).map((p) => {
                const character = getWaitingRoomCharacter(p.characterId);
                return (
                  <motion.div
                    key={p.playerId}
                    layout
                    className="flex items-center gap-2 text-xs py-1 border-b border-slate-800/80"
                  >
                    {character ? (
                      <img
                        src={character.imageUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover object-top border border-[#007A3D]/40 shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 shrink-0" />
                    )}
                    <span className="text-slate-300 flex-1 truncate">{resolvePlayerDisplayLabel(p)}</span>
                    <span className="text-slate-500 shrink-0">{p.progress.replace(/_/g, ' ')}</span>
                  </motion.div>
                );
              })}
            {(!session || Object.keys(session.players).length === 0) && (
              <p className="text-xs text-slate-500">No students connected yet. Students must join with this PIN.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Trophy className="w-4 h-4 text-amber-400" />
            Live leaderboard
          </div>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500">Scores appear when students play Level 3.</p>
            ) : (
              leaderboard.map((p, i) => {
                const character = getWaitingRoomCharacter(p.characterId);
                return (
                  <motion.div
                    key={p.playerId}
                    layout
                    className="flex items-center gap-2 text-xs py-1"
                  >
                    {character && (
                      <img
                        src={character.imageUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover object-top border border-amber-500/30 shrink-0"
                      />
                    )}
                    <span className="text-slate-300 flex-1 truncate">
                      #{i + 1} {resolvePlayerDisplayLabel(p)}
                    </span>
                    <span className="font-bold text-amber-300 tabular-nums">{p.totalScore ?? 0}</span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Students use the same lab PIN for all levels. Run <code className="text-slate-400">npm run dev</code> on one
        machine so all browsers sync via the live session API (classroom host).
      </p>
    </div>
  );
}
