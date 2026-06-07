import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  FolderKanban,
  Clock,
  PlusCircle,
  Hash,
  MessageSquare,
  X,
  Copy,
  Check,
} from 'lucide-react';
import {
  generatePin,
  createSharedLabCode,
  type InstructorClass,
  type Lab,
  type LabTemplateId,
  type ScenarioDefinition,
  type ScenarioMetric,
  type ProductionPlanningScenario,
  type LineBalancingScenario,
} from '@/app/types/classes';
import { fetchInstructorClasses, saveInstructorClasses } from '@/app/services/dataStore';
import { InstructorLiveSessionPanel } from './InstructorLiveSessionPanel';

interface LabTemplate {
  id: LabTemplateId;
  name: string;
  difficulty: 'intro' | 'intermediate';
  durationMinutes: number;
  focusAreas: string[];
  summary: string;
}

const LAB_TEMPLATES: LabTemplate[] = [
  {
    id: 'strategy-planning',
    name: 'Strategy Planning',
    difficulty: 'intro',
    durationMinutes: 45,
    focusAreas: ['Order variability', 'Lead-time demand', 'Stockouts vs. holding cost'],
    summary:
      'Students plan a single‑product supply chain with lead times and experience how decisions ripple downstream.',
  },
  {
    id: 'production-planning',
    name: 'Production Planning',
    difficulty: 'intro',
    durationMinutes: 45,
    focusAreas: ['Order quantity (Q)', 'Holding vs ordering cost', 'Demand patterns'],
    summary:
      'Students set order quantity (Q) each period. Total cost C = (Q/2)×H + (D×S)/Q. Instructor sets H, D, S and demand pattern (horizontal, trend, seasonal).',
  },
  {
    id: 'line-balancing',
    name: 'Line Balancing',
    difficulty: 'intro',
    durationMinutes: 35,
    focusAreas: ['Work element times', 'Cycle time', 'Balance delay & efficiency'],
    summary:
      'Students assign work elements to stations under a cycle-time constraint, then analyze bottlenecks and line efficiency.',
  },
];

export function InstructorDashboard() {
  const [classes, setClasses] = useState<InstructorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateDropdownId, setTemplateDropdownId] = useState<LabTemplateId | ''>('');
  const [productionH, setProductionH] = useState(2);
  const [productionD, setProductionD] = useState(10000);
  const [productionS, setProductionS] = useState(100);
  const [productionPattern, setProductionPattern] = useState<ProductionPlanningScenario['pattern']>('horizontal');
  const [lineCycleTimeSec, setLineCycleTimeSec] = useState(60);
  const [lineLevel3CycleTimeSec, setLineLevel3CycleTimeSec] = useState(55);
  const [copiedLabId, setCopiedLabId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchInstructorClasses()
      .then((data) => {
        if (active) setClasses(data);
      })
      .catch((err) => {
        if (active) setSaveError(err instanceof Error ? err.message : 'Failed to load classes');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      void saveInstructorClasses(classes)
        .then((saved) => setClasses(saved))
        .catch((err) => setSaveError(err instanceof Error ? err.message : 'Failed to save classes'));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [classes, loading]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const selectedTemplateFromDropdown = useMemo(
    () => (templateDropdownId ? LAB_TEMPLATES.find((t) => t.id === templateDropdownId) ?? null : null),
    [templateDropdownId],
  );

  const buildScenarioForTemplate = (template: LabTemplate): ScenarioDefinition => {
    if (template.id === 'production-planning') {
      return {
        title: template.name,
        productName: 'Single product',
        context: 'Students set order quantity (Q) each period to minimize total cost.',
        objectives: 'Balance holding and ordering costs across periods.',
        analysisGuidance: 'Review total cost and order quantity each period.',
        keyMetrics: [
          { id: 'm1', label: 'Total cost', description: 'C = (Q/2)×H + (D×S)/Q per period.' },
          { id: 'm2', label: 'Order quantity', description: 'Your chosen Q each period.' },
          { id: 'm3', label: 'Demand pattern', description: 'As set by the instructor.' },
        ],
      };
    }
    if (template.id === 'line-balancing') {
      return {
        title: template.name,
        productName: 'T-shirt',
        context: 'Balance the Nashama fan-shirt production line within cycle time.',
        objectives: 'Build workstations, assign tasks, and balance the line.',
        analysisGuidance: 'Check overload, idle time, and flow direction.',
        keyMetrics: [
          { id: 'm1', label: 'Cycle time', description: 'No station may exceed the target cycle time.' },
          { id: 'm2', label: 'Line efficiency', description: 'Work content vs. stations × cycle time.' },
          { id: 'm3', label: 'Balance delay', description: 'Lower is better.' },
        ],
      };
    }
    return {
      title: template.name,
      productName: 'Single product',
      context: 'Coordinate the supply chain to satisfy demand while controlling cost.',
      objectives: 'Maintain service level and control total cost.',
      analysisGuidance: 'Review inventory, cost, and service level.',
      keyMetrics: [
        { id: 'm1', label: 'Service level', description: 'Demand met each round.' },
        { id: 'm2', label: 'Total cost', description: 'Ordering, holding, and stockout costs.' },
        { id: 'm3', label: 'Inventory', description: 'Stock across the chain.' },
      ],
    };
  };

  const applyTemplateDefaults = (template: LabTemplate) => {
    if (template.id === 'line-balancing') {
      setLineCycleTimeSec(60);
    }
  };

  const handleTemplateDropdownChange = (templateId: LabTemplateId | '') => {
    setTemplateDropdownId(templateId);
    if (templateId) {
      const template = LAB_TEMPLATES.find((t) => t.id === templateId);
      if (template) applyTemplateDefaults(template);
    }
  };

  const handleAddClass = () => {
    const name = newClassName.trim() || 'New class';
    if (!name) return;
    const newClass: InstructorClass = {
      id: `class_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      labs: [],
    };
    setClasses((prev) => [newClass, ...prev]);
    setSelectedClassId(newClass.id);
    setNewClassName('');
    setShowAddClassForm(false);
  };

  const handleCreateLabFromTemplate = () => {
    if (!selectedClass || !selectedTemplateFromDropdown) return;
    const template = selectedTemplateFromDropdown;
    const scenario = buildScenarioForTemplate(template);
    const lab: Lab = {
      id: `lab_${Date.now()}`,
      templateId: template.id,
      scenario,
      pin: generatePin(),
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
    if (template.id === 'production-planning') {
      lab.productionPlanning = { H: productionH, D: productionD, S: productionS, pattern: productionPattern };
    }
    if (template.id === 'line-balancing') {
      const tasks: LineBalancingScenario['tasks'] = [
        { id: 't_cut_panels', label: 'Cut fabric panels', timeSec: 18, group: 'Cutting' },
        { id: 't_trim_edges', label: 'Trim fabric edges', timeSec: 12, group: 'Cutting' },
        { id: 't_mark_points', label: 'Mark stitch points', timeSec: 10, group: 'Cutting' },
        { id: 't_sew_shoulders', label: 'Sew shoulder seams', timeSec: 24, group: 'Sewing' },
        { id: 't_attach_sleeves', label: 'Attach sleeves', timeSec: 28, group: 'Sewing' },
        { id: 't_close_sides', label: 'Close side seams', timeSec: 22, group: 'Sewing' },
        { id: 't_hem_bottom', label: 'Hem bottom edge', timeSec: 16, group: 'Sewing' },
        { id: 't_quality_check', label: 'Inspect shirt quality', timeSec: 12, group: 'Quality Check' },
        { id: 't_fold_garment', label: 'Fold garment', timeSec: 14, group: 'Packing' },
        { id: 't_pack_label', label: 'Pack and label', timeSec: 16, group: 'Packing' },
      ];
      lab.lineBalancing = {
        cycleTimeSec: Math.max(28, Math.round(lineCycleTimeSec || 60)),
        level3CycleTimeSec: Math.max(28, Math.round(lineLevel3CycleTimeSec || 55)),
        workstationCostCoins: 100,
        tasks,
      };
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id === selectedClass.id ? { ...c, labs: [...c.labs, lab] } : c,
      ),
    );
    setShowAddTemplate(false);
    setTemplateDropdownId('');
  };

  const handleSetLabFeedback = (classId: string, labId: string, feedback: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? {
              ...c,
              labs: c.labs.map((l) =>
                l.id === labId ? { ...l, feedbackFromInstructor: feedback } : l,
              ),
            }
          : c,
      ),
    );
  };

  const createStudentJoinUrl = (cls: InstructorClass, lab: Lab) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('lab', createSharedLabCode(cls, lab));
    return url.toString();
  };

  const handleCopyStudentLink = async (cls: InstructorClass, lab: Lab) => {
    const link = createStudentJoinUrl(cls, lab);
    if (!link) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt('Copy this student link:', link);
      }
      setCopiedLabId(lab.id);
      window.setTimeout(() => {
        setCopiedLabId((current) => (current === lab.id ? null : current));
      }, 2000);
    } catch {
      window.prompt('Copy this student link:', link);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {saveError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {saveError}
        </div>
      )}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading classes from server…</div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-wide">
            <FolderKanban className="w-4 h-4 text-sky-400" />
            Instructor
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Your classes</h2>
          <p className="mt-1 text-sm text-slate-400 max-w-xl">
            Add a class, create a lab, and share the PIN. After Level 3 ends, open the class to see the leaderboard.
          </p>
        </div>
      </div>

      {/* Add class bar */}
      <div className="flex items-center justify-end gap-4 border-b border-slate-800 pb-2">
        {!showAddClassForm ? (
          <button
            onClick={() => setShowAddClassForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            <FolderKanban className="w-4 h-4" />
            Add class
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-500 w-56 focus:ring-2 focus:ring-sky-500"
              placeholder="Class name"
            />
            <button
              onClick={handleAddClass}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500"
            >
              Create class
            </button>
            <button
              onClick={() => { setShowAddClassForm(false); setNewClassName(''); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Classes content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Class list */}
        <div className="col-span-12 lg:col-span-6 space-y-3">
          {classes.length === 0 ? (
            <div className="bg-slate-900/80 border border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-sky-400 mb-1">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">No classes yet</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Add a class first, then open it and add labs from the template dropdown.
              </p>
              {showAddClassForm && (
                <div className="flex flex-col items-center gap-2 mt-4">
                  <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 w-64 focus:ring-2 focus:ring-sky-500"
                    placeholder="Class name"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddClass} className="px-4 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500">Create class</button>
                    <button onClick={() => { setShowAddClassForm(false); setNewClassName(''); }} className="px-4 py-2 rounded-lg text-sm bg-slate-700 text-slate-300">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
              classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all bg-slate-900/80 hover:bg-slate-800/90 ${
                      isSelected ? 'border-sky-400 shadow-md shadow-sky-400/30' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{cls.name}</div>
                          <div className="text-xs text-slate-400">
                            {cls.labs.length} lab{cls.labs.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(cls.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Class detail: labs with PIN, feedback */}
          <div className="col-span-12 lg:col-span-6">
            {selectedClass ? (
              <div className="bg-slate-900/85 border border-slate-700 rounded-2xl p-6 h-full flex flex-col gap-4 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white">{selectedClass.name}</h3>
                <p className="text-xs text-slate-400">Students join a lab via the 6-digit PIN.</p>
                <div className="space-y-4">
                  {selectedClass.labs.length === 0 ? (
                    <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-4 text-center text-slate-400 text-sm">
                      No labs yet. Click &ldquo;Add template&rdquo; and choose a template to create one.
                    </div>
                  ) : (
                    selectedClass.labs.map((lab) => {
                      const template = LAB_TEMPLATES.find((t) => t.id === lab.templateId);
                      return (
                        <div key={lab.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-white">{lab.scenario.title}</div>
                              <div className="text-xs text-slate-400">{template?.name ?? lab.templateId}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-700 text-slate-300">
                              {lab.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-mono font-bold text-white">PIN: {lab.pin}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleCopyStudentLink(selectedClass, lab)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500"
                            >
                              {copiedLabId === lab.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedLabId === lab.id ? 'Copied link' : 'Copy student link'}
                            </button>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-1">
                              <MessageSquare className="w-3 h-3" />
                              Feedback for students (optional)
                            </label>
                            <textarea
                              value={lab.feedbackFromInstructor ?? ''}
                              onChange={(e) => handleSetLabFeedback(selectedClass.id, lab.id, e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white resize-none h-20"
                              placeholder="Write feedback students will see after playing this lab."
                            />
                          </div>
                          {lab.templateId === 'line-balancing' && <InstructorLiveSessionPanel lab={lab} />}
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Add template: dropdown + dynamic form */}
                {!showAddTemplate ? (
                  <button
                    onClick={() => setShowAddTemplate(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add template
                  </button>
                ) : (
                  <div className="mt-4 p-4 rounded-xl border border-slate-700 bg-slate-800/60 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-slate-200">Choose template</label>
                      <button
                        onClick={() => { setShowAddTemplate(false); setTemplateDropdownId(''); }}
                        className="text-slate-400 hover:text-white"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <select
                      value={templateDropdownId}
                      onChange={(e) => handleTemplateDropdownChange((e.target.value || '') as LabTemplateId | '')}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">— Select a template —</option>
                      {LAB_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    {selectedTemplateFromDropdown && (
                      <>
                        {selectedTemplateFromDropdown.id === 'strategy-planning' && (
                          <p className="pt-2 border-t border-slate-700 text-sm text-slate-400">
                            Uses the built-in supply chain scenario. Students join with the PIN after you create the lab.
                          </p>
                        )}

                        {selectedTemplateFromDropdown.id === 'production-planning' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-700">
                            <label className="block text-xs font-semibold text-slate-300">
                              H — Holding ($/unit/year)
                              <input type="number" min="0" step="0.5" value={productionH} onChange={(e) => setProductionH(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                            </label>
                            <label className="block text-xs font-semibold text-slate-300">
                              D — Demand (units/year)
                              <input type="number" min="1" value={productionD} onChange={(e) => setProductionD(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                            </label>
                            <label className="block text-xs font-semibold text-slate-300">
                              S — Ordering ($/lot)
                              <input type="number" min="0" value={productionS} onChange={(e) => setProductionS(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                            </label>
                            <label className="block text-xs font-semibold text-slate-300">
                              Demand pattern
                              <select value={productionPattern} onChange={(e) => setProductionPattern(e.target.value as ProductionPlanningScenario['pattern'])} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white">
                                <option value="horizontal">Horizontal (stable)</option>
                                <option value="trend">Trend</option>
                                <option value="seasonal">Seasonal</option>
                              </select>
                            </label>
                          </div>
                        )}

                        {selectedTemplateFromDropdown.id === 'line-balancing' && (
                          <div className="pt-2 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="block text-sm font-semibold text-slate-200">
                              Cycle time — Level 1 &amp; 2 (seconds)
                              <input
                                type="number"
                                min="28"
                                step="1"
                                value={lineCycleTimeSec}
                                onChange={(e) => setLineCycleTimeSec(Number(e.target.value) || 60)}
                                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                              />
                            </label>
                            <label className="block text-sm font-semibold text-slate-200">
                              Cycle time — Level 3 (seconds)
                              <input
                                type="number"
                                min="28"
                                step="1"
                                value={lineLevel3CycleTimeSec}
                                onChange={(e) => setLineLevel3CycleTimeSec(Number(e.target.value) || 55)}
                                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                              />
                            </label>
                            <p className="sm:col-span-2 text-xs text-slate-500">
                              Task list, workstation cost, and Nashama story are built in. Students only need your PIN to play.
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                          <button
                            onClick={() => { setShowAddTemplate(false); setTemplateDropdownId(''); }}
                            className="px-4 py-2 rounded-lg text-sm bg-slate-700 text-slate-200 hover:bg-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateLabFromTemplate}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
                          >
                            Add lab
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-slate-900/70 border border-dashed border-slate-700 rounded-2xl p-6 text-sm text-slate-400 flex items-center justify-center h-full">
                Select a class on the left or add a new class.
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
