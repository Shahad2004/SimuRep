import { useState } from 'react';
import { ArrowRight, Clock, LayoutGrid, ListOrdered, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { NASHAMA_PRECEDENCE_RULES } from './nashamaLevel3';
import { GuideCoachStrip, GuideFocusWrap, GuideGlowButton, PlayHintPulse } from './PlayGuide';
import type { LineBalancingTask } from '@/app/types/classes';

import { nasahamaGirl, NASAHAMA_GIRL_INTRINSIC } from './nashamaLevel3Assets';

type L3BriefingGuide = 'story' | 'rules' | 'scenario' | 'start';

type Props = {
  tasks: LineBalancingTask[];
  cycleTimeSec: number;
  totalProcessingTimeSec: number;
  sequencedTasks: LineBalancingTask[];
  onStart: () => void;
  disabled?: boolean;
};

const GUIDE_STEP_NUMBER: Record<L3BriefingGuide, number> = {
  story: 1,
  rules: 2,
  scenario: 3,
  start: 4,
};

function WaveformIcon() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-end justify-center gap-0.5 rounded-lg border border-[#CE1126]/40 bg-[#CE1126]/10 px-1.5 py-1.5">
      {[3, 6, 4, 7, 5, 8, 4].map((h, i) => (
        <span key={i} className="w-0.5 rounded-full bg-[#CE1126]" style={{ height: `${h * 2}px` }} />
      ))}
    </div>
  );
}

function WorldCupRushCharacter() {
  const { width: imgW, height: imgH } = NASAHAMA_GIRL_INTRINSIC;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative mx-auto w-fit max-w-full shrink-0 lg:mx-0"
    >
      <div className="relative inline-block max-w-full overflow-hidden rounded-2xl border-2 border-[#CE1126]/60 bg-gradient-to-b from-[#CE1126]/40 via-black/95 to-black shadow-[inset_0_8px_20px_rgba(0,0,0,0.5),0_8px_24px_rgba(206,17,38,0.2)]">
        <img
          src={nasahamaGirl}
          width={imgW}
          height={imgH}
          alt="Nashama fan with official shirt box"
          className="block h-auto w-[min(26vw,124px)] max-w-full bg-transparent"
          style={{ aspectRatio: `${imgW} / ${imgH}` }}
          draggable={false}
        />
      </div>
    </motion.figure>
  );
}

function ScenarioStoryBlock() {
  const objectives = [
    'Balance workstations efficiently',
    'Optimize production flow',
    'Minimize bottlenecks and delays',
    'Meet customer demand before time runs out',
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
      <WorldCupRushCharacter />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#007A3D]">Al Nashama — Jordan</p>

        <h1 className="mt-1 text-xl font-bold uppercase leading-tight tracking-wide text-white md:text-2xl">
          Nashama World Cup Challenge
        </h1>

        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200/95 md:text-[15px]">
          <p>Jordan has qualified for the World Cup.</p>
          <p>
            Thousands of fans are waiting for their official Nashama shirts before the opening match.
          </p>
          <p>
            As the lead Industrial Engineer of the Nashama T-Shirt Factory, your mission is to ensure every shirt is
            produced and delivered on time.
          </p>
          <p>
            But there is a problem.
          </p>
          <p>
            The current production line is inefficient, workflows are causing delays, and demand is higher than ever.
          </p>
          <p>Using everything you learned in Levels 1 and 2, you must:</p>
          <ul className="space-y-1.5">
            {objectives.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="shrink-0 text-[#007A3D]" aria-hidden>
                  ✅
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>Every decision affects factory performance.</p>
          <p className="font-semibold text-white">Every second matters.</p>
          <p className="font-semibold text-[#CE1126]">Can you deliver victory before kickoff?</p>
        </div>
      </div>
    </div>
  );
}

export function NashamaLevel3BriefingScreen({
  tasks,
  cycleTimeSec,
  totalProcessingTimeSec,
  sequencedTasks,
  onStart,
  disabled,
}: Props) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [guideStep, setGuideStep] = useState<L3BriefingGuide>('story');

  const advanceGuide = () => {
    setGuideStep((s) => {
      if (s === 'story') return 'rules';
      if (s === 'rules') return 'scenario';
      if (s === 'scenario') return 'start';
      return 'start';
    });
  };

  const scenarioFocused = guideStep === 'story' || guideStep === 'scenario';
  const isScenarioStep = guideStep === 'scenario';

  return (
    <>
      <main className="relative mx-auto flex w-full max-w-6xl flex-col justify-start px-4 pb-24 pt-2 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`w-full rounded-2xl border border-[#CE1126]/35 bg-black/55 p-4 shadow-2xl shadow-black/50 backdrop-blur-md md:p-6 lg:p-7 ${
            isScenarioStep ? 'max-h-[calc(100dvh-10rem)] overflow-y-auto' : ''
          }`}
        >
          <GuideCoachStrip
            show
            step={GUIDE_STEP_NUMBER[guideStep]}
            totalSteps={4}
            title={
              guideStep === 'story'
                ? 'Read the mission'
                : guideStep === 'rules'
                  ? 'Know the rules'
                  : guideStep === 'scenario'
                    ? 'Read the scenario'
                    : 'Start building'
            }
            onNext={guideStep === 'start' ? undefined : advanceGuide}
            nextLabel={
              guideStep === 'rules' ? 'Almost there' : guideStep === 'scenario' ? 'Got it' : 'Next'
            }
          >
            {guideStep === 'story'
              ? 'Jordan needs Nashama fan shirts before the World Cup match. Read the story — balance the line and the flow.'
              : guideStep === 'rules'
                ? 'These precedence rules matter: earlier shirt steps must finish before later ones.'
                : guideStep === 'scenario'
                  ? 'Read the full scenario below — understand the urgent fan shirt order before you enter the factory.'
                  : 'Press the glowing green button below when you are ready to enter the factory.'}
          </GuideCoachStrip>

          <div
            className={
              isScenarioStep
                ? 'space-y-4'
                : 'grid gap-4 lg:grid-cols-[1fr_minmax(220px,280px)] lg:items-start'
            }
          >
            <PlayHintPulse
              active={isScenarioStep}
              label="Scenario"
              tone="green"
              className={`min-w-0 ${isScenarioStep ? 'pt-10' : ''}`}
            >
              <GuideFocusWrap focused={scenarioFocused} className="min-w-0">
                <ScenarioStoryBlock />
              </GuideFocusWrap>
            </PlayHintPulse>

            {!isScenarioStep && (
            <GuideFocusWrap focused={guideStep === 'rules'}>
              <PlayHintPulse active={guideStep === 'rules'} label="Rules" tone="green">
                <div className="rounded-xl border-2 border-[#007A3D]/50 bg-black/45 p-4 lg:mt-0 shadow-[0_0_24px_rgba(0,122,61,0.2)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#007A3D]">
                    <ListOrdered className="h-4 w-4" />
                    Precedence Constraints
                  </div>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-200/90">
                    {NASHAMA_PRECEDENCE_RULES.map((rule) => (
                      <li key={rule} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CE1126]" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </PlayHintPulse>
            </GuideFocusWrap>
            )}
          </div>

          {guideStep !== 'scenario' && (
          <div className={`mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 transition-opacity ${guideStep !== 'start' ? 'opacity-30' : ''}`}>
            {[
              { value: `${totalProcessingTimeSec}s`, label: 'Total processing', icon: LayoutGrid },
              { value: `${cycleTimeSec}s`, label: 'Cycle time', icon: Clock },
              { value: tasks.length, label: 'Tasks', icon: ListOrdered },
              { value: 'Balance + flow', label: 'Goal', icon: Timer },
            ].map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-slate-600/60 bg-black/45 px-3 py-3 md:px-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#007A3D]/35 bg-[#007A3D]/10">
                  <Icon className="h-5 w-5 text-[#007A3D]" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums text-white md:text-2xl">{value}</div>
                  <div className="text-[11px] text-slate-400">{label}</div>
                </div>
              </div>
            ))}
          </div>
          )}

          {guideStep === 'start' && (
          <>
          <button
            type="button"
            onClick={() => setShowAllTasks((v) => !v)}
            className="mt-4 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            {showAllTasks ? 'Hide' : 'View'} full task list ({tasks.length} tasks)
          </button>
          {showAllTasks && (
            <div className="mt-3 grid max-h-40 gap-1.5 overflow-y-auto rounded-xl border border-slate-700/80 bg-black/50 p-3 sm:grid-cols-2">
              {sequencedTasks.map((t, i) => (
                <div
                  key={t.id}
                  className="flex justify-between gap-2 rounded bg-slate-900/50 px-2 py-1 text-[11px] text-slate-300"
                >
                  <span>
                    <span className="text-slate-500">{i + 1}.</span> {t.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-amber-200/90">{t.timeSec}s</span>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </motion.div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[200px] items-center gap-3 rounded-xl border border-slate-700/70 bg-black/50 px-3 py-2.5">
            <WaveformIcon />
            <p className="text-sm text-slate-200">
              The fans are waiting… <span className="font-semibold text-white">Make them proud!</span>
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < GUIDE_STEP_NUMBER[guideStep]
                    ? 'bg-[#007A3D] shadow-[0_0_10px_rgba(0,122,61,0.8)]'
                    : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          <GuideGlowButton active={guideStep === 'start'} label="Press start">
            <button
              type="button"
              onClick={() => {
                setGuideStep('start');
                onStart();
              }}
              disabled={disabled || guideStep !== 'start'}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 px-6 py-3 text-base font-bold text-slate-950 shadow-[0_0_28px_rgba(163,230,53,0.55)] transition hover:opacity-95 disabled:opacity-50 md:px-8"
            >
              Let&apos;s Start Building
              <ArrowRight className="h-5 w-5" />
            </button>
          </GuideGlowButton>
        </div>
      </footer>
    </>
  );
}
