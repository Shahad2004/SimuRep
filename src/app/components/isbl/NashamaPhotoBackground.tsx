import { AnimatePresence, motion } from 'motion/react';
import { LEVEL3_PHOTO, type CinematicKey } from './nashamaLevel3Cinematic';

type DimLevel = 'light' | 'medium' | 'heavy';

type Props = {
  photoKey: keyof typeof LEVEL3_PHOTO;
  cinematic: CinematicKey | null;
  cinematicCaption?: string;
  dimLevel?: DimLevel;
};

const CINEMATIC_PHOTO: Record<CinematicKey, keyof typeof LEVEL3_PHOTO> = {
  intro: 'intro',
  production: 'production',
  submit: 'submit',
};

const DIM_CLASS: Record<DimLevel, string> = {
  light: 'bg-black/15',
  medium: 'bg-black/30',
  heavy: 'bg-black/40',
};

export function NashamaPhotoBackground({
  photoKey,
  cinematic,
  cinematicCaption,
  dimLevel = 'medium',
}: Props) {
  const src = LEVEL3_PHOTO[photoKey];
  const cinematicSrc = cinematic ? LEVEL3_PHOTO[CINEMATIC_PHOTO[cinematic]] : null;
  const isFullscreenCinematic = cinematic != null;

  return (
    <>
      {!isFullscreenCinematic && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <motion.div className={`absolute inset-0 ${DIM_CLASS[dimLevel]}`} />
        </motion.div>
      )}

      <AnimatePresence>
        {isFullscreenCinematic && cinematicSrc && (
          <motion.div
            key={cinematic}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-end pb-12 md:pb-16 px-4"
          >
            <img
              src={cinematicSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            {cinematicCaption && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ delay: 0.15 }}
                className="relative z-10 max-w-2xl text-center text-xl font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] md:text-3xl"
              >
                {cinematicCaption}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
