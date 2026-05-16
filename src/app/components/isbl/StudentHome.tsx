import { useState, useEffect } from 'react';
import { Factory, GraduationCap, Hash, LogIn, MessageSquare, Play, Send, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import {
  loadStudentJoined,
  saveStudentJoined,
  loadInstructorClasses,
  saveInstructorClasses,
  findLabByPin,
  readSharedLabCode,
  mergeSharedLab,
  type StudentJoinedEntry,
  type InstructorClass,
} from '@/app/types/classes';
import girlExplain from '@/assets/line-balancing/character/girl_explain.png';
import wsCutting from '@/assets/line-balancing/workstations/ws_cutting.png';
import wsPacking from '@/assets/line-balancing/workstations/ws_packing.png';
import wsQuality from '@/assets/line-balancing/workstations/ws_quality.png';
import wsSewing from '@/assets/line-balancing/workstations/ws_sewing.png';

interface StudentHomeProps {
  onPlayLab: (entry: StudentJoinedEntry) => void;
}

export function StudentHome({ onPlayLab }: StudentHomeProps) {
  const [joined, setJoined] = useState<StudentJoinedEntry[]>([]);
  const [classes, setClasses] = useState<InstructorClass[]>([]);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinNotice, setPinNotice] = useState('');
  const [feedbackFor, setFeedbackFor] = useState<StudentJoinedEntry | null>(null);

  const openLab = (entry: StudentJoinedEntry) => {
    onPlayLab(entry);
  };

  const entryFromFoundLab = (
    found: NonNullable<ReturnType<typeof findLabByPin>>,
    joinedAt = new Date().toISOString(),
  ): StudentJoinedEntry => ({
    classId: found.class.id,
    labId: found.lab.id,
    className: found.class.name,
    labTitle: found.lab.scenario.title,
    templateId: found.lab.templateId,
    joinedAt,
    feedback: found.lab.feedbackFromInstructor,
  });

  useEffect(() => {
    let instructorClasses = loadInstructorClasses();
    let entries = loadStudentJoined();
    entries = entries.map((e) => {
      const cls = instructorClasses.find((c) => c.id === e.classId);
      const lab = cls?.labs.find((l) => l.id === e.labId);
      return { ...e, feedback: lab?.feedbackFromInstructor ?? e.feedback };
    });
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const sharedLabCode = params?.get('lab')?.trim();
    const joinPin = params?.get('join')?.trim();

    if (sharedLabCode) {
      const shared = readSharedLabCode(sharedLabCode);
      if (shared) {
        instructorClasses = mergeSharedLab(instructorClasses, shared);
        saveInstructorClasses(instructorClasses);
        setPinNotice(`Lab loaded: ${shared.lab.scenario.title}. Enter the PIN from your instructor to join.`);
      } else {
        setPinError('This student link is invalid. Ask your instructor to copy it again.');
      }
    }

    setClasses(instructorClasses);
    if (joinPin && instructorClasses.length > 0) {
      const found = findLabByPin(instructorClasses, joinPin);
      if (found) {
        const existingEntry = entries.find((j) => j.classId === found.class.id && j.labId === found.lab.id);
        const entry = entryFromFoundLab(found, existingEntry?.joinedAt);
        entries = existingEntry
          ? entries.map((j) => (j.classId === entry.classId && j.labId === entry.labId ? entry : j))
          : [entry, ...entries];
        saveStudentJoined(entries);
        openLab(entry);
        window.history.replaceState({}, '', window.location.pathname + (window.location.hash || ''));
      }
    }
    setJoined(entries);
    saveStudentJoined(entries);
  }, []);

  const handleJoinWithPin = () => {
    setPinError('');
    const latestClasses = loadInstructorClasses();
    setClasses(latestClasses);
    const found = findLabByPin(latestClasses, pin);
    if (!found) {
      setPinError('Invalid or expired PIN. If your instructor is on another device, ask for the student link.');
      return;
    }
    const existingEntry = joined.find((j) => j.classId === found.class.id && j.labId === found.lab.id);
    const entry = entryFromFoundLab(found, existingEntry?.joinedAt);
    setPinNotice('');
    if (existingEntry) {
      const next = joined.map((j) => (j.classId === entry.classId && j.labId === entry.labId ? entry : j));
      setJoined(next);
      saveStudentJoined(next);
      setPin('');
      openLab(entry);
      return;
    }
    const next = [entry, ...joined];
    setJoined(next);
    saveStudentJoined(next);
    setPin('');
    openLab(entry);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">My dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">Your Virtual Lab games, classes, and instructor feedback.</p>
      </div>

      {/* Student intro */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 mb-6 overflow-hidden relative"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5" />
        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.28fr] gap-6 items-stretch">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Before you start</div>
                <h3 className="mt-1 text-2xl font-semibold text-white">Your job on the line</h3>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3 items-end">
                <div className="relative rounded-2xl border border-cyan-500/35 bg-slate-950/50 px-4 py-3 shadow-[0_0_28px_rgba(34,211,238,0.10)]">
                  <div
                    className="pointer-events-none absolute -right-2 bottom-7 h-3 w-3 rotate-45 border border-cyan-500/35 bg-slate-950"
                    style={{ borderLeftColor: 'transparent', borderBottomColor: 'transparent' }}
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.35 }}
                    className="text-base leading-7 text-slate-200"
                  >
                    A shirt should move smoothly from cutting to sewing, checking, folding, and packing. But if one station takes too long, shirts pile up there while the next stations wait. Your job is to fix that by balancing the work.
                  </motion.p>
                </div>
                <motion.img
                  src={girlExplain}
                  alt="Virtual Lab guide"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-4">
                  <div className="text-sm font-semibold text-white">First, see the flow</div>
                  <div className="mt-1 text-xs text-slate-400">One shirt moves through cutting, sewing, and packing.</div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-4">
                  <div className="text-sm font-semibold text-white">Then, spot the problem</div>
                  <div className="mt-1 text-xs text-slate-400">Slow work creates queues and idle time.</div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-4">
                  <div className="text-sm font-semibold text-white">Finally, balance it</div>
                  <div className="mt-1 text-xs text-slate-400">Move tasks so no station breaks Cycle Time.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/35 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">Why balance matters</div>
                  <div className="text-xs text-slate-400 mt-0.5">A slow sewing station blocks the whole line.</div>
                </div>
                <div className="rounded-full border border-rose-500/30 bg-rose-900/10 px-3 py-1 text-[11px] font-semibold text-rose-200">
                  Bottleneck
                </div>
              </div>

              <div className="relative mt-5">
                <div className="absolute left-12 right-12 top-36 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    initial={{ width: '0%' }}
                    animate={{ width: ['0%', '45%', '78%', '100%'] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <motion.div
                  className="absolute left-0 top-28 z-10 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100"
                  animate={{ x: [0, 120, 235, 350, 350], opacity: [1, 1, 1, 1, 0.65] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  Shirts waiting
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                    {
                      name: 'Cut table',
                      load: '40 / 60s',
                      bar: ['25%', '66%', '66%'],
                      tone: 'bg-emerald-500',
                      note: 'cuts fabric panels',
                      image: wsCutting,
                    },
                    {
                      name: 'Sewing',
                      load: '72 / 60s',
                      bar: ['55%', '100%', '100%'],
                      tone: 'bg-rose-500',
                      note: 'too much sleeve work',
                      image: wsSewing,
                    },
                    {
                      name: 'Quality Check',
                      load: '12 / 60s',
                      bar: ['8%', '20%', '20%'],
                      tone: 'bg-amber-500',
                      note: 'waiting to inspect',
                      image: wsQuality,
                    },
                    {
                      name: 'Packing',
                      load: '18 / 60s',
                      bar: ['12%', '30%', '30%'],
                      tone: 'bg-amber-500',
                      note: 'waiting for shirts',
                      image: wsPacking,
                    },
                  ].map((station, idx) => (
                    <div
                      key={station.name}
                      className={`relative rounded-xl border bg-slate-900/70 p-4 ${
                        station.name === 'Sewing' ? 'border-rose-500/50' : 'border-slate-700'
                      }`}
                    >
                      <div className="h-36 flex items-center justify-center">
                        <img src={station.image} alt={`${station.name} workstation`} className="max-h-36 max-w-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-100">{station.name}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums">{station.load}</div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${station.tone}`}
                          animate={{ width: station.bar }}
                          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.15 }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">{station.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {[
                  { label: 'See flow', icon: Factory, tone: 'text-cyan-200 border-cyan-500/30' },
                  { label: 'Find delay', icon: Timer, tone: 'text-rose-200 border-rose-500/30' },
                  { label: 'Move tasks', icon: Play, tone: 'text-sky-200 border-sky-500/30' },
                  { label: 'Balance line', icon: Send, tone: 'text-emerald-200 border-emerald-500/30' },
                ].map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.label}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: idx * 0.3 }}
                      className="text-center"
                    >
                      <div className={`mx-auto h-9 w-9 rounded-xl border bg-slate-900 flex items-center justify-center ${step.tone}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="mt-1.5 text-[10px] font-semibold text-slate-200">{step.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Join with PIN */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-white">Join with PIN</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">Enter the 6-digit PIN from your instructor to join a class and lab.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              setPinError('');
            }}
            placeholder="000000"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white font-mono text-lg tracking-widest focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            maxLength={6}
          />
          <button
            onClick={handleJoinWithPin}
            disabled={pin.length !== 6}
            className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Join
          </button>
        </div>
        {pinNotice && <p className="text-sm text-emerald-300 mt-2">{pinNotice}</p>}
        {pinError && <p className="text-sm text-red-400 mt-2">{pinError}</p>}
      </div>

      {/* Joined labs */}
      <div>
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          My labs
        </h3>
        {joined.length === 0 ? (
          <div className="bg-slate-900/70 border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
            No labs yet. Join a class with a PIN from your instructor, or scan the lab QR code.
          </div>
        ) : (
          <ul className="space-y-3">
            {joined.map((entry) => (
              <li
                key={`${entry.classId}-${entry.labId}`}
                className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-white">{entry.labTitle}</div>
                  <div className="text-xs text-slate-400">Class: {entry.className}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openLab(entry)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500"
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                  {entry.feedback && (
                    <button
                      onClick={() => setFeedbackFor(entry)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Feedback
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Feedback modal */}
      {feedbackFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
          onClick={() => setFeedbackFor(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Instructor feedback — {feedbackFor.labTitle}</h3>
              <button
                onClick={() => setFeedbackFor(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{feedbackFor.feedback}</p>
            <button
              onClick={() => setFeedbackFor(null)}
              className="mt-4 w-full py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
