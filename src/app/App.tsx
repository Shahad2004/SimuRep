import React, { useState, useEffect, useCallback } from 'react';
import { StudentDashboard } from './components/isbl/StudentDashboard';
import { StudentHome } from './components/isbl/StudentHome';
import { ProductionPlanningGame } from './components/isbl/ProductionPlanningGame';
import { LineBalancingGame } from './components/isbl/LineBalancingGame';
import { Level3WaitingRoom } from './components/isbl/Level3WaitingRoom';
import { NashamaLevel3Challenge } from './components/isbl/NashamaLevel3Challenge';
import { InstructorDashboard } from './components/isbl/InstructorDashboard';
import { Users, GraduationCap } from 'lucide-react';
import { HomeLandingPage } from './components/isbl/HomeLandingPage';
import { resolveLevel3CycleTimeSec } from './types/classes';
import { APP_NAME, APP_TAGLINE, appLogo } from '@/app/brand';
import type { StudentJoinedEntry } from './types/classes';
import type { Lab } from './types/classes';
import type { ScenarioDefinition } from './types/classes';
import { getOrCreatePlayerId, loadLiveSession, upsertLivePlayer } from './services/liveSessionSync';
import { fetchLabByClientId } from './services/dataStore';
import type { StudentProgressLevel } from './types/liveSession';

type StudentScreen = 'dashboard' | 'game' | 'waiting' | 'level3';

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
  const [resolvedLab, setResolvedLab] = useState<Lab | null>(null);
  const [labPin, setLabPin] = useState('');
  const [labLoading, setLabLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('join=') || search.includes('lab=')) setView('student');
    }
  }, []);

  useEffect(() => {
    if (!selectedLabEntry) {
      setResolvedLab(null);
      setLabPin('');
      return;
    }

    let active = true;
    setLabLoading(true);
    void fetchLabByClientId(selectedLabEntry.labId)
      .then((found) => {
        if (!active) return;
        if (found) {
          setResolvedLab(found.lab);
          setLabPin(found.lab.pin);
        } else {
          setResolvedLab(null);
          setLabPin('');
        }
      })
      .finally(() => {
        if (active) setLabLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLabEntry]);

  const classConfig = resolvedLab
    ? {
        id: resolvedLab.id,
        name: selectedLabEntry?.className ?? '',
        templateId: resolvedLab.templateId,
        createdAt: resolvedLab.createdAt,
        status: resolvedLab.status,
        scenario: resolvedLab.scenario,
      }
    : null;

  const changeRole = () => {
    setView('select');
    setStudentScreen('dashboard');
    setSelectedLabEntry(null);
  };

  const openLab = useCallback(async (entry: StudentJoinedEntry) => {
    setSelectedLabEntry(entry);
    const found = await fetchLabByClientId(entry.labId);
    const pin = found?.lab.pin ?? '';
    setResolvedLab(found?.lab ?? null);
    setLabPin(pin);
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
  const showAppHeader = view !== 'select' && !immersiveStudentGame;

  return (
    <div className={`min-h-screen ${view === 'select' ? 'bg-[#061327]' : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950'}`}>
      {showAppHeader && (
      <header className="fixed inset-x-0 top-0 z-[60] border-b border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-xl">
                <img src={appLogo} alt={APP_NAME} className="h-14 w-auto object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-semibold text-sky-200 tracking-wide">{APP_NAME}</div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-400/80">{APP_TAGLINE}</div>
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

      <main className={showAppHeader ? 'pt-[5.25rem]' : view === 'select' ? '' : 'min-h-screen'}>
      {view === 'select' ? (
        <HomeLandingPage
          onSelectStudent={() => setView('student')}
          onSelectInstructor={() => setView('instructor')}
        />
      ) : view === 'student' ? (
        studentScreen === 'dashboard' ? (
          <StudentHome onPlayLab={openLab} />
        ) : labLoading ? (
          <div className="container mx-auto p-8 text-slate-400">Loading lab…</div>
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
            cycleTimeSec={resolveLevel3CycleTimeSec(resolvedLab?.lineBalancing)}
            onLeave={handleLeaveLab}
          />
        ) : resolvedLab?.templateId === 'production-planning' && resolvedLab.productionPlanning ? (
          <ProductionPlanningGame
            scenario={resolvedLab.scenario}
            productionPlanning={resolvedLab.productionPlanning}
            onLeave={handleLeaveLab}
          />
        ) : resolvedLab?.templateId === 'line-balancing' ? (
          <LineBalancingGame
            scenario={resolvedLab.scenario}
            lineBalancing={resolvedLab.lineBalancing}
            studentEntry={selectedLabEntry ?? undefined}
            labPin={labPin}
            displayName={displayName}
            onLeave={handleLeaveLab}
            onLevel2Complete={handleLevel2Complete}
          />
        ) : resolvedLab?.templateId === 'strategy-planning' && classConfig ? (
          <StudentDashboard initialClass={classConfig} onLeave={handleLeaveLab} />
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
