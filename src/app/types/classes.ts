/**
 * Virtual Lab: Classes (instructor) and Labs (games) with PIN and QR join.
 * Students join via PIN or QR and see feedback from instructor.
 */

export type LabTemplateId = 'strategy-planning' | 'production-planning' | 'line-balancing';

export interface ScenarioMetric {
  id: string;
  label: string;
  description: string;
}

export interface ScenarioDefinition {
  title: string;
  productName?: string;
  context: string;
  objectives: string;
  analysisGuidance: string;
  keyMetrics: ScenarioMetric[];
}

/** Production Planning (EOQ) scenario params — instructor sets these */
export interface ProductionPlanningScenario {
  /** Holding cost ($/unit/year) */
  H: number;
  /** Demand (units/year) */
  D: number;
  /** Ordering cost ($/lot) */
  S: number;
  /** Demand pattern: horizontal (stable), trend, seasonal */
  pattern: 'horizontal' | 'trend' | 'seasonal';
}

export interface LineBalancingTask {
  id: string;
  label: string;
  /** Processing time (seconds) */
  timeSec: number;
  /** Optional group label for UI (e.g. Cutting/Sewing/Packing) */
  group?: string;
  /** 1-based step in the fixed shirt flow (cutting → sewing → QC → packing) */
  sequenceOrder?: number;
}

/** Line Balancing scenario params. Tasks and station cost are fixed; instructor sets cycle times. */
export interface LineBalancingScenario {
  /** Cycle time (seconds) for Level 1 and Level 2 */
  cycleTimeSec: number;
  /** Cycle time (seconds) for Level 3 (Nashama). Falls back to `cycleTimeSec` if omitted. */
  level3CycleTimeSec?: number;
  /** Cost per workstation (coins) */
  workstationCostCoins: number;
  /** Work elements the student assigns to stations */
  tasks: LineBalancingTask[];
}

const MIN_LINE_CYCLE_TIME_SEC = 28;

/** Resolved Level 3 cycle time from lab config (backward-compatible with single-field labs). */
export function resolveLevel3CycleTimeSec(lb: LineBalancingScenario | undefined): number | undefined {
  if (!lb) return undefined;
  const l3 = Number(lb.level3CycleTimeSec);
  if (Number.isFinite(l3) && l3 > 0) return Math.max(MIN_LINE_CYCLE_TIME_SEC, Math.round(l3));
  const shared = Number(lb.cycleTimeSec);
  if (Number.isFinite(shared) && shared > 0) return Math.max(MIN_LINE_CYCLE_TIME_SEC, Math.round(shared));
  return undefined;
}

export interface Lab {
  id: string;
  templateId: LabTemplateId;
  scenario: ScenarioDefinition;
  /** Production Planning specific (when templateId === 'production-planning') */
  productionPlanning?: ProductionPlanningScenario;
  /** Line Balancing specific (when templateId === 'line-balancing') */
  lineBalancing?: LineBalancingScenario;
  /** 6-digit PIN for students to join */
  pin: string;
  createdAt: string;
  status: 'draft' | 'active';
  /** Optional feedback from instructor for students who played this lab */
  feedbackFromInstructor?: string;
}

export interface InstructorClass {
  id: string;
  name: string;
  createdAt: string;
  labs: Lab[];
}

export interface StudentJoinedEntry {
  classId: string;
  labId: string;
  className: string;
  labTitle: string;
  templateId: LabTemplateId;
  joinedAt: string;
  /** Feedback from instructor (copied from lab when viewed) */
  feedback?: string;
}

export interface LabPerformanceResult {
  id: string;
  classId: string;
  labId: string;
  templateId: LabTemplateId;
  submittedAt: string;
  metrics: {
    efficiencyPct?: number;
    idleTimeSec?: number;
    stationsUsed?: number;
    minStations?: number;
    overloadedStations?: number;
    allTasksAssigned?: boolean;
  };
}

const INSTRUCTOR_CLASSES_KEY = 'simulab_instructor_classes_v2';
const STUDENT_JOINED_KEY = 'simulab_student_joined_v1';
const LAB_PERFORMANCE_RESULTS_KEY = 'simulab_lab_performance_results_v1';

// Legacy keys kept for reference only — persistence is via backend API (dataStore.ts).
void INSTRUCTOR_CLASSES_KEY;
void STUDENT_JOINED_KEY;
void LAB_PERFORMANCE_RESULTS_KEY;

interface SharedLabPayload {
  version: 1;
  classId: string;
  className: string;
  classCreatedAt: string;
  lab: Lab;
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function loadInstructorClasses(): InstructorClass[] {
  return [];
}

export function saveInstructorClasses(_classes: InstructorClass[]): void {
  /* use fetchInstructorClasses / saveInstructorClasses from dataStore.ts */
}

export function loadStudentJoined(): StudentJoinedEntry[] {
  return [];
}

export function saveStudentJoined(_entries: StudentJoinedEntry[]): void {
  /* use fetchStudentJoined / saveStudentJoined from dataStore.ts */
}

export function loadLabPerformanceResults(): LabPerformanceResult[] {
  return [];
}

export function saveLabPerformanceResult(_result: LabPerformanceResult): void {
  /* use saveLabPerformanceResult from dataStore.ts */
}

export function findLabById(classes: InstructorClass[], labId: string): { class: InstructorClass; lab: Lab } | null {
  for (const c of classes) {
    const lab = c.labs.find((l) => l.id === labId);
    if (lab) return { class: c, lab };
  }
  return null;
}

export function getLabPinFromClasses(classes: InstructorClass[], labId: string): string {
  for (const c of classes) {
    const lab = c.labs.find((l) => l.id === labId);
    if (lab) return lab.pin;
  }
  return '';
}

export function findLabByPin(classes: InstructorClass[], pin: string): { class: InstructorClass; lab: Lab } | null {
  const trimmed = pin.trim();
  for (const c of classes) {
    const lab = c.labs.find((l) => l.pin === trimmed);
    if (lab) return { class: c, lab };
  }
  return null;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSharedLabCode(cls: InstructorClass, lab: Lab): string {
  const payload: SharedLabPayload = {
    version: 1,
    classId: cls.id,
    className: cls.name,
    classCreatedAt: cls.createdAt,
    lab,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function readSharedLabCode(code: string): { class: InstructorClass; lab: Lab } | null {
  try {
    const payload = JSON.parse(fromBase64Url(code)) as Partial<SharedLabPayload>;
    if (payload.version !== 1 || !payload.classId || !payload.className || !payload.classCreatedAt || !payload.lab) {
      return null;
    }
    const lab = payload.lab;
    if (!lab.id || !lab.pin || !lab.templateId || !lab.scenario || !lab.createdAt || !lab.status) {
      return null;
    }
    return {
      class: {
        id: payload.classId,
        name: payload.className,
        createdAt: payload.classCreatedAt,
        labs: [lab],
      },
      lab,
    };
  } catch {
    return null;
  }
}

export function mergeSharedLab(classes: InstructorClass[], shared: { class: InstructorClass; lab: Lab }): InstructorClass[] {
  const existingClass = classes.find((c) => c.id === shared.class.id);
  if (!existingClass) return [shared.class, ...classes];

  return classes.map((c) => {
    if (c.id !== shared.class.id) return c;
    const existingLab = c.labs.some((l) => l.id === shared.lab.id);
    return {
      ...c,
      name: shared.class.name,
      labs: existingLab
        ? c.labs.map((l) => (l.id === shared.lab.id ? shared.lab : l))
        : [shared.lab, ...c.labs],
    };
  });
}

export { generatePin };
