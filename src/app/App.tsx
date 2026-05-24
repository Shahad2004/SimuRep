import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StudentDashboard } from './components/isbl/StudentDashboard';
import { StudentHome } from './components/isbl/StudentHome';
import { ProductionPlanningGame } from './components/isbl/ProductionPlanningGame';
import { LineBalancingGame } from './components/isbl/LineBalancingGame';
import { Level3WaitingRoom } from './components/isbl/Level3WaitingRoom';
import { NashamaLevel3Challenge } from './components/isbl/NashamaLevel3Challenge';
import { InstructorDashboard } from './components/isbl/InstructorDashboard';
import { Users, GraduationCap } from 'lucide-react';
import { loadInstructorClasses, getLabPinFromClasses } from './types/classes';
import htuLogo from '@/assets/icons/htu-industrial-virtual-lab.png';
import type { StudentJoinedEntry } from './types/classes';
import type { Lab } from './types/classes';
import type { ScenarioDefinition } from './types/classes';
import { getOrCreatePlayerId, loadLiveSession, upsertLivePlayer } from './services/liveSessionSync';
import type { StudentProgressLevel } from './types/liveSession';

type StudentScreen = 'dashboard' | 'game' | 'waiting' | 'level3';

function useResolvedLab(entry: StudentJoinedEntry | null): {
  classConfig: {
    id: string;
    name: string;
    templateId: string;
    createdAt: string;
    status: 'draft' | 'active';
    scenario: ScenarioDefinition;
  };
  lab: Lab;
} | null {
  return useMemo(() => {
    if (!entry) return null;
    const classes = loadInstructorClasses();
    const cls = classes.find((c) => c.id === entry.classId);
    const lab = cls?.labs.find((l) => l.id === entry.labId);
    if (!cls || !lab) return null;
    return {
      classConfig: {
        id: lab.id,
        name: entry.className,
        templateId: lab.templateId,
        createdAt: lab.createdAt,
        status: lab.status,
        scenario: lab.scenario,
      },
      lab,
    };
  }, [entry]);
}

async function resolveInitialStudentScreen(
  entry: StudentJoinedEntry,
  pin: string,
): Promise<StudentScreen> {
  const playerId = getOrCreatePlayerId(entry.labId);
  const displayName = `${entry.className} · Student`;
  const session = await loadLiveSession(entry.labId, pin);
  const existing = session.players[playerId];

  if (!existing) {
    await upsertLivePlayer(entry.labId, pin, {
      playerId,
      displayName,
      progress: 'joined',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    return 'game';
  }

  const progress = existing.progress;
  if (progress === 'waiting_l3' && session.level3Status !== 'live') return 'waiting';
  if (
    progress === 'level3_active' ||
    progress === 'level3_complete' ||
    (progress === 'waiting_l3' && session.level3Status === 'live')
  ) {
    return 'level3';
  }
  return 'game';
}

export default function App() {
  const [view, setView] = useState<'select' | 'student' | 'instructor'>('select');
  const [studentScreen, setStudentScreen] = useState<StudentScreen>('dashboard');
  const [selectedLabEntry, setSelectedLabEntry] = useState<StudentJoinedEntry | null>(null);
  const resolved = useResolvedLab(selectedLabEntry);
  const labPin = resolved ? getLabPinFromClasses(loadInstructorClasses(), resolved.lab.id) : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('join=') || search.includes('lab=')) setView('student');
    }
  }, []);

  const changeRole = () => {
    setView('select');
    setStudentScreen('dashboard');
    setSelectedLabEntry(null);
  };

  const openLab = useCallback(async (entry: StudentJoinedEntry) => {
    const classes = loadInstructorClasses();
    const pin = getLabPinFromClasses(classes, entry.labId);
    setSelectedLabEntry(entry);
    const screen = pin ? await resolveInitialStudentScreen(entry, pin) : 'game';
    setStudentScreen(screen);
  }, []);

  const displayName = selectedLabEntry?.className ? `${selectedLabEntry.className} · Student` : 'Nashama Student';

  const handleLeaveLab = () => {
    setStudentScreen('dashboard');
    setSelectedLabEntry(null);
  };

  const handleLevel2Complete = () => {
    setStudentScreen('waiting');
  };

  const handleLevel3Started = () => {
    setStudentScreen('level3');
  };

  const immersiveStudentGame =
    view === 'student' &&
    (studentScreen === 'game' || studentScreen === 'waiting' || studentScreen === 'level3');
  const showAppHeader = !immersiveStudentGame;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {showAppHeader && (
      <header className="fixed inset-x-0 top-0 z-[60] border-b border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-xl">
                <img src={htuLogo} alt="HTU Industrial Virtual Lab" className="h-14 w-auto object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-semibold text-sky-200 tracking-wide">Virtual Lab</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-400/80">Industrial simulation</div>
              </div>
            </div>
            {view !== 'select' && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {view === 'student' ? <GraduationCap className="w-4 h-4 text-sky-300" /> : <Users className="w-4 h-4 text-emerald-300" />}
                  {view === 'student' ? 'Student interface' : 'Instructor interface'}
                </div>
                <button
                  onClick={changeRole}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-sm"
                >
                  Change user
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      <main className={showAppHeader ? 'pt-[5.25rem]' : 'min-h-screen'}>
      {view === 'select' ? (
        <div className="container mx-auto p-6 max-w-5xl">
          <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/30 overflow-hidden">
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-5 flex justify-center">
                <img src={htuLogo} alt="HTU Industrial Virtual Lab" className="w-full max-w-sm rounded-2xl object-contain shadow-2xl shadow-slate-950/30" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Production Line Balancing Lab</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">See the bottleneck. Balance the work. Improve the flow.</h2>
            </div>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setView('student')} className="group rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6 text-left hover:bg-sky-500/15 transition-all">
                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="mt-4 text-xl font-semibold text-white">Student</div>
                <div className="mt-2 text-sm text-slate-400">Enter a PIN, open your lab, and complete the line-balancing challenge.</div>
              </button>
              <button onClick={() => setView('instructor')} className="group rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-left hover:bg-emerald-500/15 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Users className="w-6 h-6" />
                </div>
                <div className="mt-4 text-xl font-semibold text-white">Instructor</div>
                <div className="mt-2 text-sm text-slate-400">Manage classes, create labs, share PINs, and start the World Cup final together.</div>
              </button>
            </div>
          </div>
        </div>
      ) : view === 'student' ? (
        studentScreen === 'dashboard' ? (
          <StudentHome onPlayLab={openLab} />
        ) : studentScreen === 'waiting' && selectedLabEntry ? (
          <Level3WaitingRoom
            entry={selectedLabEntry}
            pin={labPin}
            displayName={displayName}
            onLeave={handleLeaveLab}
            onLevel3Started={handleLevel3Started}
          />
        ) : studentScreen === 'level3' && selectedLabEntry ? (
          <NashamaLevel3Challenge
            studentEntry={selectedLabEntry}
            labPin={labPin}
            displayName={displayName}
            onLeave={handleLeaveLab}
          />
        ) : resolved?.lab.templateId === 'production-planning' && resolved.lab.productionPlanning ? (
          <ProductionPlanningGame
            scenario={resolved.lab.scenario}
            productionPlanning={resolved.lab.productionPlanning}
            onLeave={handleLeaveLab}
          />
        ) : resolved?.lab.templateId === 'line-balancing' ? (
          <LineBalancingGame
            scenario={resolved.lab.scenario}
            lineBalancing={resolved.lab.lineBalancing}
            studentEntry={selectedLabEntry ?? undefined}
            labPin={labPin}
            displayName={displayName}
            onLeave={handleLeaveLab}
            onLevel2Complete={handleLevel2Complete}
          />
        ) : resolved?.lab.templateId === 'strategy-planning' ? (
          <StudentDashboard initialClass={resolved?.classConfig ?? undefined} onLeave={handleLeaveLab} />
        ) : (
          <StudentHome onPlayLab={openLab} />
        )
      ) : (
        <InstructorDashboard />
      )}
      </main>
    </div>
  );
}
