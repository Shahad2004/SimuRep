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

/** Line Balancing scenario params. Level 1 keeps tasks and station cost fixed; instructor sets CT. */
export interface LineBalancingScenario {
  /** Target cycle time (seconds) */
  cycleTimeSec: number;
  /** Cost per workstation (coins) */
  workstationCostCoins: number;
  /** Work elements the student assigns to stations */
  tasks: LineBalancingTask[];
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(INSTRUCTOR_CLASSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InstructorClass[];
      if (Array.isArray(parsed)) return parsed;
    }
    const legacy = window.localStorage.getItem('isbl_instructor_classes_v1');
    if (legacy) {
      const arr = JSON.parse(legacy) as Array<{ id: string; name: string; templateId: string; scenario: ScenarioDefinition; createdAt: string; status: string }>;
      if (Array.isArray(arr) && arr.length > 0) {
        const migrated: InstructorClass[] = arr.map((c) => ({
          id: c.id,
          name: c.name,
          createdAt: c.createdAt,
          labs: [
            {
              id: `lab_${c.id}`,
              templateId: (c.templateId as LabTemplateId) || 'strategy-planning',
              scenario: c.scenario,
              pin: generatePin(),
              createdAt: c.createdAt,
              status: (c.status as 'draft' | 'active') || 'draft',
            },
          ],
        }));
        window.localStorage.setItem(INSTRUCTOR_CLASSES_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {}
  return [];
}

export function saveInstructorClasses(classes: InstructorClass[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INSTRUCTOR_CLASSES_KEY, JSON.stringify(classes));
}

export function loadStudentJoined(): StudentJoinedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STUDENT_JOINED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudentJoinedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStudentJoined(entries: StudentJoinedEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STUDENT_JOINED_KEY, JSON.stringify(entries));
}

export function loadLabPerformanceResults(): LabPerformanceResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LAB_PERFORMANCE_RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabPerformanceResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLabPerformanceResult(result: LabPerformanceResult): void {
  if (typeof window === 'undefined') return;
  const results = loadLabPerformanceResults();
  window.localStorage.setItem(LAB_PERFORMANCE_RESULTS_KEY, JSON.stringify([result, ...results]));
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
