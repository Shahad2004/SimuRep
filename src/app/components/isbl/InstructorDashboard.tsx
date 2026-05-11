import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  FolderKanban,
  BarChart3,
  Clock,
  Sparkles,
  PlusCircle,
  Hash,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  loadInstructorClasses,
  loadLabPerformanceResults,
  loadStudentJoined,
  saveInstructorClasses,
  generatePin,
  type InstructorClass,
  type Lab,
  type LabTemplateId,
  type ScenarioDefinition,
  type ScenarioMetric,
  type ProductionPlanningScenario,
  type LineBalancingScenario,
} from '@/app/types/classes';

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
  const [classes, setClasses] = useState<InstructorClass[]>(() => loadInstructorClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateDropdownId, setTemplateDropdownId] = useState<LabTemplateId | ''>('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [scenarioProduct, setScenarioProduct] = useState('Single product');
  const [scenarioContext, setScenarioContext] = useState('');
  const [scenarioObjectives, setScenarioObjectives] = useState('');
  const [scenarioAnalysis, setScenarioAnalysis] = useState('');
  const [metricOneLabel, setMetricOneLabel] = useState('Service level');
  const [metricOneDesc, setMetricOneDesc] = useState('Percentage of customer demand that is fully met each round.');
  const [metricTwoLabel, setMetricTwoLabel] = useState('Total cost');
  const [metricTwoDesc, setMetricTwoDesc] = useState('Sum of ordering, holding, and stockout costs across rounds.');
  const [metricThreeLabel, setMetricThreeLabel] = useState('Inventory at each station');
  const [metricThreeDesc, setMetricThreeDesc] = useState('How stock is distributed across supplier, factory, warehouses, and DC.');
  const [productionH, setProductionH] = useState(2);
  const [productionD, setProductionD] = useState(10000);
  const [productionS, setProductionS] = useState(100);
  const [productionPattern, setProductionPattern] = useState<ProductionPlanningScenario['pattern']>('horizontal');
  const [lineCycleTimeSec, setLineCycleTimeSec] = useState(60);

  useEffect(() => {
    saveInstructorClasses(classes);
  }, [classes]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null,
    [classes, selectedClassId],
  );

  const selectedTemplateFromDropdown = useMemo(
    () => (templateDropdownId ? LAB_TEMPLATES.find((t) => t.id === templateDropdownId) ?? null : null),
    [templateDropdownId],
  );

  const applyTemplateDefaults = (template: LabTemplate) => {
    setScenarioTitle(template.name);
    setScenarioProduct(template.id === 'line-balancing' ? 'T-shirt' : 'Single product');
    setScenarioContext(
      template.id === 'production-planning'
        ? 'Students set order quantity (Q) each period. Total cost C = (Q/2)×H + (D×S)/Q. You set H, D, S and demand pattern.'
        : template.id === 'line-balancing'
          ? 'A small T-shirt factory needs to balance its line. Students place fixed tasks like cutting fabric panels, sewing sleeves, closing side seams, folding, and packing into workstations. Each station must stay within the cycle time.'
        : 'You are responsible for coordinating this supply chain to satisfy customer demand while controlling total cost.',
    );
    setScenarioObjectives(
      template.id === 'production-planning'
        ? '1. Choose order quantity Q each period to minimize total cost.\n2. Balance holding cost (Q/2)×H with ordering cost (D×S)/Q.\n3. Adapt to the demand pattern (horizontal, trend, or seasonal).'
        : template.id === 'line-balancing'
          ? '1. Keep every T-shirt workstation within cycle time.\n2. Spread cutting, sewing, and packing work so the line feels balanced.\n3. Improve efficiency by reducing idle time and avoiding overload.'
        : '1. Maintain high service level while avoiding frequent stockouts.\n2. Minimize total cost by balancing ordering and holding costs.\n3. Observe how your decisions impact upstream inventory and flow.',
    );
    setScenarioAnalysis(
      template.id === 'production-planning'
        ? 'Focus on total cost, order quantity, and how well your Q matched the scenario.'
        : template.id === 'line-balancing'
          ? 'Focus on the bottleneck station (highest workload), idle time distribution, and the efficiency/balance delay metrics.'
        : 'Focus on inventory levels, total cost breakdown, and service level trends.',
    );
    if (template.id === 'production-planning') {
      setMetricOneLabel('Total cost');
      setMetricOneDesc('C = (Q/2)×H + (D×S)/Q per period.');
      setMetricTwoLabel('Order quantity');
      setMetricTwoDesc('Your chosen Q each period.');
      setMetricThreeLabel('Demand pattern');
      setMetricThreeDesc('Horizontal, trend, or seasonal as set by instructor.');
    } else if (template.id === 'line-balancing') {
      setMetricOneLabel('Cycle time (bottleneck)');
      setMetricOneDesc('Time of the busiest station; must be ≤ target cycle time.');
      setMetricTwoLabel('Line efficiency');
      setMetricTwoDesc('Efficiency = (sum of task times) / (stations × cycle time).');
      setMetricThreeLabel('Balance delay');
      setMetricThreeDesc('Balance delay = 1 − efficiency. Lower is better.');
    } else {
      setMetricOneLabel('Service level');
      setMetricOneDesc('Percentage of customer demand that is fully met each round.');
      setMetricTwoLabel('Total cost');
      setMetricTwoDesc('Sum of ordering, holding, and stockout costs across rounds.');
      setMetricThreeLabel('Inventory at each station');
      setMetricThreeDesc('How stock is distributed across supplier, factory, warehouses, and DC.');
    }
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
    const scenario: ScenarioDefinition = {
      title: scenarioTitle.trim() || template.name,
      productName: scenarioProduct.trim() || 'Single product',
      context: scenarioContext.trim(),
      objectives: scenarioObjectives.trim(),
      analysisGuidance: scenarioAnalysis.trim(),
      keyMetrics: [
        { id: 'm1', label: metricOneLabel.trim() || 'Metric 1', description: metricOneDesc.trim() || '' },
        { id: 'm2', label: metricTwoLabel.trim() || 'Metric 2', description: metricTwoDesc.trim() || '' },
        { id: 'm3', label: metricThreeLabel.trim() || 'Metric 3', description: metricThreeDesc.trim() || '' },
      ],
    };
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

  const totalClasses = classes.length;
  const totalLabs = classes.reduce((n, c) => n + c.labs.length, 0);
  const joinedEntries = loadStudentJoined();
  const performanceResults = loadLabPerformanceResults();
  const classPerformance = classes.map((cls) => {
    const joinedCount = joinedEntries.filter((entry) => entry.classId === cls.id).length;
    const results = performanceResults.filter((result) => result.classId === cls.id);
    const efficiencies = results
      .map((result) => result.metrics.efficiencyPct)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const idleTimes = results
      .map((result) => result.metrics.idleTimeSec)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const avgEfficiency =
      efficiencies.length > 0 ? Math.round(efficiencies.reduce((total, value) => total + value, 0) / efficiencies.length) : null;
    const avgIdle =
      idleTimes.length > 0 ? Math.round(idleTimes.reduce((total, value) => total + value, 0) / idleTimes.length) : null;
    const bestEfficiency = efficiencies.length > 0 ? Math.max(...efficiencies) : null;
    const lastSubmission = results[0]?.submittedAt;
    return {
      classId: cls.id,
      className: cls.name,
      labsCount: cls.labs.length,
      joinedCount,
      submissionsCount: results.length,
      avgEfficiency,
      avgIdle,
      bestEfficiency,
      lastSubmission,
    };
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top: Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-wide">
            <FolderKanban className="w-4 h-4 text-sky-400" />
            Instructor Control Room
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Design and launch your supply chain labs
          </h2>
          <p className="mt-1 text-sm text-slate-400 max-w-xl">
            Create classes from ready‑made lab templates, define rich industrial scenarios, and
            share them instantly with your students.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-[260px]">
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-3 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Your classes</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-semibold text-white">{totalClasses}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-3 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Labs</span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-semibold text-white">{totalLabs}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-3 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Templates</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-semibold text-white">{LAB_TEMPLATES.length}</div>
          </div>
        </div>
      </div>

      {/* Class performance */}
      <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Class performance</h3>
            <p className="text-xs text-slate-400 mt-1">
              Overall view from submitted line-balancing attempts on this device.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            {performanceResults.length} submission{performanceResults.length !== 1 ? 's' : ''} recorded
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-4 text-center text-sm text-slate-400">
            Add a class and launch a lab to start seeing performance.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {classPerformance.map((perf) => (
              <div key={perf.classId} className="rounded-xl border border-slate-700 bg-slate-950/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{perf.className}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {perf.labsCount} lab{perf.labsCount !== 1 ? 's' : ''} • {perf.joinedCount} joined
                    </div>
                  </div>
                  <div className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
                    {perf.submissionsCount} attempt{perf.submissionsCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-500">Avg efficiency</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-200">
                      {perf.avgEfficiency == null ? '—' : `${perf.avgEfficiency}%`}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-500">Avg idle time</div>
                    <div className="mt-1 text-lg font-semibold text-amber-200">
                      {perf.avgIdle == null ? '—' : `${perf.avgIdle}s`}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-500">Best run</div>
                    <div className="mt-1 text-lg font-semibold text-sky-200">
                      {perf.bestEfficiency == null ? '—' : `${perf.bestEfficiency}%`}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  {perf.lastSubmission ? `Last submission ${new Date(perf.lastSubmission).toLocaleString()}` : 'No submitted attempts yet.'}
                </div>
              </div>
            ))}
          </div>
        )}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                          <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-300">Scenario title</label>
                            <input
                              value={scenarioTitle}
                              onChange={(e) => setScenarioTitle(e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                              placeholder="e.g. Strategy Planning"
                            />
                            <label className="block text-xs font-semibold text-slate-300">Product</label>
                            <select
                              value={scenarioProduct}
                              onChange={(e) => setScenarioProduct(e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                            >
                              <option value="Single product">Single product</option>
                              <option value="Widget A">Widget A</option>
                              <option value="Component X">Component X</option>
                              <option value="SKU-100">SKU-100</option>
                              <option value="Custom">Custom</option>
                            </select>
                            <label className="block text-xs font-semibold text-slate-300">Industrial context</label>
                            <textarea
                              value={scenarioContext}
                              onChange={(e) => setScenarioContext(e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white resize-none h-24"
                              placeholder="Describe the scenario."
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-300">Decision focus (1‑2‑3)</label>
                            <textarea
                              value={scenarioObjectives}
                              onChange={(e) => setScenarioObjectives(e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white resize-none h-20"
                            />
                            <label className="block text-xs font-semibold text-slate-300">Analysis guidance</label>
                            <textarea
                              value={scenarioAnalysis}
                              onChange={(e) => setScenarioAnalysis(e.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white resize-none h-20"
                            />
                          </div>
                        </div>

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
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-700">
                            <label className="block text-xs font-semibold text-slate-300">
                              Cycle time (seconds)
                              <input
                                type="number"
                                min="28"
                                step="1"
                                value={lineCycleTimeSec}
                                onChange={(e) => setLineCycleTimeSec(Number(e.target.value) || 60)}
                                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                              />
                            </label>
                            <div className="md:col-span-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-400">
                              Instructor controls Cycle Time only. Level 1 uses a fixed realistic garment task list and a fixed workstation cost of 100 coins.
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-700">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-300">Key metric 1</div>
                            <input value={metricOneLabel} onChange={(e) => setMetricOneLabel(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                            <textarea value={metricOneDesc} onChange={(e) => setMetricOneDesc(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 resize-none h-14" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-300">Key metric 2</div>
                            <input value={metricTwoLabel} onChange={(e) => setMetricTwoLabel(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                            <textarea value={metricTwoDesc} onChange={(e) => setMetricTwoDesc(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 resize-none h-14" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-300">Key metric 3</div>
                            <input value={metricThreeLabel} onChange={(e) => setMetricThreeLabel(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                            <textarea value={metricThreeDesc} onChange={(e) => setMetricThreeDesc(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 resize-none h-14" />
                          </div>
                        </div>

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
