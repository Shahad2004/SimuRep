import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, LogOut, Shirt, Users } from 'lucide-react';
import type { StudentJoinedEntry } from '@/app/types/classes';
import { computeLiveSessionStats } from '@/app/types/liveSession';
import { getOrCreatePlayerId } from '@/app/services/liveSessionSync';
import { useLiveSession } from '@/app/hooks/useLiveSession';
import { JordanFlagStripe, NashamaPanel, NashamaWorldCupBadge } from './NashamaJordanTheme';
import htuLogo from '@/assets/icons/htu-industrial-virtual-lab.png';

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
  const { session, registerPlayer, updateProgress } = useLiveSession(entry.labId, pin);
  const [playerId] = useState(() => getOrCreatePlayerId(entry.labId));

  useEffect(() => {
    void registerPlayer({
      playerId,
      displayName,
      progress: 'waiting_l3',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    const heartbeat = window.setInterval(() => {
      void updateProgress(playerId, 'waiting_l3');
    }, 4000);
    return () => window.clearInterval(heartbeat);
  }, [playerId, displayName, registerPlayer, updateProgress]);

  useEffect(() => {
    if (session?.level3Status === 'live') {
      void updateProgress(playerId, 'level3_active').then(() => onLevel3Started());
    }
  }, [session?.level3Status, playerId, updateProgress, onLevel3Started]);

  const stats = session ? computeLiveSessionStats(session) : null;
  const connected = session ? Object.values(session.players) : [];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-black via-slate-950 to-[#0a1628]">
      <div className="fixed inset-x-0 top-0 z-50 shrink-0 border-b border-[#CE1126]/30 bg-black/90 backdrop-blur-md">
        <JordanFlagStripe />
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={htuLogo} alt="" className="h-10 w-auto" />
            <div>
              <div className="text-white font-bold">Waiting Room — Level 3</div>
              <NashamaWorldCupBadge />
            </div>
          </div>
          <button onClick={onLeave} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm flex items-center gap-1">
            <LogOut className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-[5.5rem]">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <NashamaPanel variant="urgent" className="p-8 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mx-auto w-20 h-20 rounded-full border-2 border-[#CE1126]/50 bg-[#CE1126]/10 flex items-center justify-center"
          >
            <Clock className="w-10 h-10 text-[#CE1126]" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mt-6">Waiting for instructor to start the final challenge…</h1>
          <p className="text-slate-400 mt-3 text-sm max-w-md mx-auto">
            You finished Level 2. Stay on this screen — when your instructor starts the Nashama World Cup challenge, everyone
            enters together like Kahoot.
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
              <div key={lbl as string} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center">
                <div className="text-2xl font-bold text-white tabular-nums">{val}</div>
                <div className="text-[11px] text-slate-400">{lbl}</div>
              </div>
            ))}
          </div>
        )}

        <NashamaPanel className="mt-6 p-5">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Users className="w-5 h-5 text-cyan-400" />
            Connected students ({connected.length})
          </div>
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {connected.map((p) => (
                <motion.div
                  key={p.playerId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex justify-between rounded-lg border px-3 py-2 text-sm ${
                    p.playerId === playerId ? 'border-[#007A3D]/50 bg-[#007A3D]/10' : 'border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <span className="text-slate-200">
                    {p.displayName}
                    {p.playerId === playerId ? ' (you)' : ''}
                  </span>
                  <span className="text-[11px] text-slate-500 uppercase">{p.progress.replace(/_/g, ' ')}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {connected.length === 0 && <p className="text-sm text-slate-500">Waiting for classmates to connect…</p>}
          </div>
        </NashamaPanel>

        <p className="mt-6 text-center text-xs text-slate-500">
          Same PIN as Level 1 & 2 · Do not refresh — you will enter automatically when the instructor starts.
        </p>
      </div>
      </div>
    </div>
  );
}
