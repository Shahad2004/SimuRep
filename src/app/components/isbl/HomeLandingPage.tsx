import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ArrowRight, GraduationCap, Presentation } from 'lucide-react';
import { appLogo } from '@/app/brand';
import homepageBk from '@/assets/icons/homepage-bk.jpeg';

const NAVY = '#061327';
const ACCENT = '#ff8210';

type HomeLandingPageProps = {
  onSelectStudent: () => void;
  onSelectInstructor: () => void;
};

function ConveyorScene() {
  const stations = [
    { label: '6s', ok: true },
    { label: '5s', ok: true },
    { label: '18s', ok: false, bottleneck: true },
    { label: '4s', ok: true },
  ];

  return (
    <div className="relative mx-auto mt-6 max-w-4xl px-4">
      <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm shadow-[0_0_60px_rgba(0,120,255,0.12)]">
        <div className="absolute inset-x-6 top-[52%] h-2 rounded-full bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
            animate={{ x: ['-10%', '120%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative flex justify-between gap-2 md:gap-4">
          {stations.map((st, i) => (
            <div key={st.label} className="flex flex-1 flex-col items-center">
              <div
                className={`relative flex h-20 w-full max-w-[100px] flex-col items-center justify-end rounded-lg border-2 pb-2 md:h-24 ${
                  st.bottleneck
                    ? 'border-rose-500/80 bg-rose-950/40 shadow-[0_0_28px_rgba(244,63,94,0.35)]'
                    : 'border-emerald-500/40 bg-slate-900/60'
                }`}
              >
                <div
                  className={`mb-1 h-2 w-2 rounded-full ${st.ok ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse'}`}
                />
                <span className="text-[10px] font-bold text-slate-300 md:text-xs">Station {i + 1}</span>
                <span
                  className={`text-xs font-black tabular-nums md:text-sm ${st.bottleneck ? 'text-rose-300' : 'text-emerald-200'}`}
                >
                  {st.label}
                </span>
                {st.bottleneck && (
                  <div className="absolute -right-1 bottom-1 flex flex-col gap-0.5">
                    {[0, 1, 2, 3].map((b) => (
                      <motion.div
                        key={b}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: b * 0.15 }}
                        className="h-3 w-4 rounded-sm border border-amber-700/60 bg-amber-900/80 md:h-3.5 md:w-5"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-3 h-10 overflow-hidden">
          {[0, 1, 2, 3, 4].map((box) => (
            <motion.div
              key={box}
              className="absolute top-1 h-7 w-8 rounded border border-amber-600/50 bg-gradient-to-b from-amber-700/90 to-amber-900 shadow-md md:h-8 md:w-9"
              initial={{ left: '-8%' }}
              animate={{
                left: box < 3 ? ['-8%', '22%', '48%'] : ['-8%', '22%', '48%', '62%'],
              }}
              transition={{
                duration: box < 3 ? 4 : 5.5,
                repeat: Infinity,
                ease: 'linear',
                delay: box * 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GlassRoleCard({
  title,
  description,
  icon,
  accentClass,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  accentClass: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative w-full rounded-2xl border border-white/15 bg-white/[0.06] p-6 text-left backdrop-blur-xl shadow-xl transition-shadow hover:shadow-[0_0_40px_rgba(255,130,16,0.15)] md:p-8"
    >
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${accentClass} shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white md:text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300/90 md:text-base">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff8210] group-hover:gap-3 transition-all">
        Continue
        <ArrowRight className="h-4 w-4" />
      </span>
    </motion.button>
  );
}

export function HomeLandingPage({ onSelectStudent, onSelectInstructor }: HomeLandingPageProps) {
  const [phase, setPhase] = useState<'hero' | 'roles'>('hero');
  const [heroMessage, setHeroMessage] = useState<'bottleneck' | 'challenge'>('bottleneck');

  useEffect(() => {
    const t = window.setTimeout(() => setHeroMessage('challenge'), 2000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: NAVY }}>
      <div className="pointer-events-none absolute inset-0">
        <img
          src={homepageBk}
          alt=""
          className="h-full w-full object-cover object-center scale-105 blur-[2px]"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${NAVY}e6 0%, ${NAVY}cc 45%, ${NAVY}f2 100%)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(56,120,255,0.12),transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="LineUp" className="h-10 w-auto object-contain md:h-12" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 sm:block">
              Production Line Balancing Lab
            </span>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 md:text-xs">
            Learn · Simulate · Optimize
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-2 md:px-8">
          <AnimatePresence mode="wait">
            {phase === 'hero' ? (
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.45 }}
                className="w-full max-w-4xl text-center"
              >
                <motion.img
                  src={appLogo}
                  alt="LineUp"
                  className="mx-auto h-20 w-auto object-contain md:h-28"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                />

                <motion.p
                  className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-slate-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Production Line Balancing Lab
                </motion.p>
                <motion.h1
                  className="mt-3 text-2xl font-semibold leading-tight text-white md:text-4xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  See the bottleneck. Balance the work. Improve the flow.
                </motion.h1>

                <ConveyorScene />

                <motion.div
                  className="mx-auto mt-6 max-w-lg"
                  layout
                  transition={{ duration: 0.5 }}
                >
                  <AnimatePresence mode="wait">
                    {heroMessage === 'bottleneck' ? (
                      <motion.div
                        key="warn"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <AlertTriangle className="h-8 w-8 text-rose-400" strokeWidth={2.5} />
                        <p className="text-lg font-black uppercase tracking-wide text-rose-300 md:text-xl">
                          A Bottleneck Has Been Detected
                        </p>
                        <p className="text-sm text-slate-400">
                          One station is overloaded and slowing down the entire production line.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="challenge"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-bold text-cyan-200 md:text-xl"
                      >
                        Can You Balance the Production Line?
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={() => setPhase('roles')}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl px-10 py-4 text-base font-bold text-white shadow-lg transition-all hover:brightness-110 md:text-lg"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: `0 0 32px ${ACCENT}66`,
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Enter Lab
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="roles"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-3xl"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white md:text-3xl">How Would You Like to Enter?</h2>
                  <p className="mt-2 text-sm text-slate-400">Choose your role to continue into the lab.</p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <GlassRoleCard
                    title="Student"
                    description="Join a lab and complete the line-balancing challenge."
                    icon={<GraduationCap className="h-7 w-7 text-white" />}
                    accentClass="bg-sky-600/90 shadow-sky-500/30"
                    onClick={onSelectStudent}
                  />
                  <GlassRoleCard
                    title="Instructor"
                    description="Create labs, manage classes, and monitor performance."
                    icon={<Presentation className="h-7 w-7 text-white" />}
                    accentClass="bg-emerald-600/90 shadow-emerald-500/30"
                    onClick={onSelectInstructor}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setPhase('hero')}
                  className="mt-8 mx-auto block text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Back to intro
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
