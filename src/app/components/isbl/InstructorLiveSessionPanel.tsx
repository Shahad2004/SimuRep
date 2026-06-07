import { useEffect, useMemo, useState } from 'react';
import { Play, Square, Users } from 'lucide-react';
import { motion } from 'motion/react';
import type { Lab } from '@/app/types/classes';
import {
  computeLiveSessionStats,
  liveSessionToLeaderboardEntries,
  type LabLiveSession,
} from '@/app/types/liveSession';
import { useLiveSession } from '@/app/hooks/useLiveSession';
import { instructorEndLevel3, instructorStartLevel3 } from '@/app/services/liveSessionSync';
import { loadNashamaLeaderboard, type NashamaLeaderboardEntry } from './nashamaLevel3';
import { getWaitingRoomCharacter, resolvePlayerDisplayLabel } from './waitingRoomCharacters';

function FinalResultsList({ entries }: { entries: NashamaLeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 py-2">No scores recorded.</p>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((row, i) => {
        const character = row.characterId ? getWaitingRoomCharacter(row.characterId) : null;
        return (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2.5"
          >
            <span className="w-7 text-center text-sm font-bold text-slate-400 tabular-nums">{i + 1}</span>
            {character ? (
              <img
                src={character.imageUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover object-top border border-slate-600 shrink-0"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium text-white truncate">{row.playerName}</span>
            <span className="text-sm font-bold text-amber-300 tabular-nums">{row.totalScore}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function InstructorLiveSessionPanel({ lab }: { lab: Lab }) {
  const { session, refresh } = useLiveSession(lab.id, lab.pin);
  const [storedLeaderboard, setStoredLeaderboard] = useState<NashamaLeaderboardEntry[]>([]);
  const stats = session ? computeLiveSessionStats(session) : null;
  const isEnded = session?.level3Status === 'ended';
  const isLive = session?.level3Status === 'live';

  useEffect(() => {
    void loadNashamaLeaderboard(lab.id).then(setStoredLeaderboard);
  }, [lab.id, session?.level3Status]);

  const results = useMemo(() => {
    const live = liveSessionToLeaderboardEntries(session);
    if (live.length > 0) return live;
    return storedLeaderboard;
  }, [lab.id, session, storedLeaderboard]);

  const handleStart = async () => {
    await instructorStartLevel3(lab.id, lab.pin);
    await refresh();
  };

  const handleEnd = async () => {
    await instructorEndLevel3(lab.id, lab.pin);
    await refresh();
  };

  if (lab.templateId !== 'line-balancing') return null;

  if (isEnded) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="text-sm font-semibold text-white mb-3">Leaderboard</div>
        <FinalResultsList entries={results} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#CE1126]/35 bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">Level 3 — final challenge</div>
        <div className="flex gap-2 flex-wrap">
          {session?.level3Status !== 'live' && (
            <button
              type="button"
              onClick={() => void handleStart()}
              className="px-4 py-2 rounded-xl bg-[#007A3D] hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start final challenge
            </button>
          )}
          {isLive && (
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

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Users className="w-4 h-4 text-cyan-400" />
          Students
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
            <p className="text-xs text-slate-500">No students connected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
