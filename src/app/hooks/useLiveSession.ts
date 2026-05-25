import { useCallback, useEffect, useState } from 'react';
import type { LabLiveSession } from '@/app/types/liveSession';
import {
  claimWaitingRoomCharacter,
  loadLiveSession,
  patchLivePlayerProgress,
  subscribeLiveSession,
  upsertLivePlayer,
} from '@/app/services/liveSessionSync';
import type { LabLivePlayer } from '@/app/types/liveSession';
import type { StudentProgressLevel } from '@/app/types/liveSession';

const POLL_MS = 1500;

export function useLiveSession(labId: string | undefined, pin: string | undefined) {
  const [session, setSession] = useState<LabLiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!labId || !pin) return null;
    const s = await loadLiveSession(labId, pin);
    setSession(s);
    setLoading(false);
    return s;
  }, [labId, pin]);

  useEffect(() => {
    if (!labId || !pin) {
      setLoading(false);
      return;
    }
    void refresh();
    const unsub = subscribeLiveSession(labId, setSession);
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, [labId, pin, refresh]);

  const registerPlayer = useCallback(
    async (player: LabLivePlayer) => {
      if (!labId || !pin) return null;
      const s = await upsertLivePlayer(labId, pin, player);
      setSession(s);
      return s;
    },
    [labId, pin],
  );

  const updateProgress = useCallback(
    async (playerId: string, progress: StudentProgressLevel, extra?: Partial<LabLivePlayer>) => {
      if (!labId || !pin) return null;
      const s = await patchLivePlayerProgress(labId, pin, playerId, { progress, ...extra });
      setSession(s);
      return s;
    },
    [labId, pin],
  );

  const claimCharacter = useCallback(
    async (player: LabLivePlayer) => {
      if (!labId || !pin) return { ok: false as const, error: 'Session not ready' };
      const result = await claimWaitingRoomCharacter(labId, pin, player);
      setSession(result.session);
      return result.ok ? { ok: true as const, session: result.session } : { ok: false as const, error: result.error };
    },
    [labId, pin],
  );

  return { session, loading, refresh, registerPlayer, updateProgress, claimCharacter };
}
