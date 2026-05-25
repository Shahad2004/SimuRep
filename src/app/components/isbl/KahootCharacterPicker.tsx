import { motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import {
  WAITING_ROOM_CHARACTERS,
  type WaitingRoomCharacterId,
} from './waitingRoomCharacters';

/** Kahoot-style accent colors for each pick tile */
const KAHOOT_TILE_ACCENTS = [
  { bg: 'from-rose-600 to-rose-800', border: 'border-rose-400', ring: 'ring-rose-400/50', glow: 'shadow-rose-500/40' },
  { bg: 'from-sky-600 to-sky-800', border: 'border-sky-400', ring: 'ring-sky-400/50', glow: 'shadow-sky-500/40' },
  { bg: 'from-amber-500 to-amber-700', border: 'border-amber-300', ring: 'ring-amber-300/50', glow: 'shadow-amber-400/40' },
  { bg: 'from-emerald-600 to-emerald-800', border: 'border-emerald-400', ring: 'ring-emerald-400/50', glow: 'shadow-emerald-500/40' },
  { bg: 'from-violet-600 to-violet-800', border: 'border-violet-400', ring: 'ring-violet-400/50', glow: 'shadow-violet-500/40' },
];

export function KahootCharacterPicker({
  takenIds,
  selectedId,
  pickingId,
  lockedIn,
  error,
  onPick,
}: {
  takenIds: Set<WaitingRoomCharacterId>;
  selectedId: WaitingRoomCharacterId | null;
  pickingId: WaitingRoomCharacterId | null;
  lockedIn: boolean;
  error: string | null;
  onPick: (id: WaitingRoomCharacterId) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="inline-block rounded-full bg-gradient-to-r from-[#CE1126] via-white/10 to-[#007A3D] p-[2px]"
        >
          <motion.div layout className="rounded-full bg-slate-950 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white">
            Kahoot-style pick
          </motion.div>
        </motion.div>
        <h2 className="mt-4 text-2xl md:text-3xl font-black text-white tracking-tight">
          Tap your Nashama player
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          First come, first served — each player can only be chosen once in this lab session.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200 text-center font-medium"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {WAITING_ROOM_CHARACTERS.map((character, index) => {
          const accent = KAHOOT_TILE_ACCENTS[index % KAHOOT_TILE_ACCENTS.length];
          const taken = takenIds.has(character.id);
          const selected = selectedId === character.id;
          const picking = pickingId === character.id;
          const disabled = taken || pickingId != null || lockedIn;

          return (
            <motion.button
              key={character.id}
              type="button"
              disabled={disabled && !selected}
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={!disabled ? { scale: 1.06, y: -6 } : undefined}
              whileTap={!disabled ? { scale: 0.94 } : undefined}
              onClick={() => onPick(character.id)}
              className={`relative overflow-hidden rounded-2xl border-2 p-2 text-left transition-shadow ${
                selected
                  ? `${accent.border} ring-4 ${accent.ring} shadow-xl ${accent.glow}`
                  : taken
                    ? 'border-slate-700/60 opacity-45 cursor-not-allowed'
                    : `${accent.border} hover:shadow-lg ${accent.glow} cursor-pointer`
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg} opacity-20`} />
              <div className="relative">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full aspect-[3/4] object-cover object-top"
                    draggable={false}
                  />
                </div>
                {picking && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                )}
                {selected && !picking && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-lg"
                  >
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                  </motion.div>
                )}
                {taken && !selected && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/65">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-200">Taken</span>
                  </div>
                )}
              </div>
              <motion.div layout className="relative mt-2 px-1 text-center">
                <div className="text-[11px] md:text-xs font-bold text-white leading-tight">{character.name}</div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function KahootPickCelebration({
  characterName,
  imageUrl,
  onContinue,
}: {
  characterName: string;
  imageUrl: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="max-w-sm w-full text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-36 h-36 rounded-full border-4 border-[#007A3D] overflow-hidden shadow-[0_0_48px_rgba(0,122,61,0.5)]"
        >
          <img src={imageUrl} alt={characterName} className="w-full h-full object-cover object-top" />
        </motion.div>
        <motion.h2
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-6 text-3xl font-black text-white"
        >
          You&apos;re in!
        </motion.h2>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-lg font-semibold text-emerald-300"
        >
          {characterName}
        </motion.p>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3 text-sm text-slate-400"
        >
          Waiting for your instructor to start the final challenge…
        </motion.p>
        <motion.button
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-[#007A3D] to-emerald-500 py-4 text-lg font-black text-white shadow-lg shadow-emerald-900/40 hover:brightness-110"
        >
          Enter waiting room
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
