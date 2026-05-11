/**
 * Instructor Scenario Model — single source of truth for Supply Chain Planning.
 * All calculations use scenario + student decisions + deterministic RNG (seed).
 */

export interface ScenarioIdentity {
  scenarioId: string;
  title: string;
  rounds: number;
  seed: number;
}

export interface PlanningParams {
  leadTimeOrder: number;
  leadTimeTransfer: number;
  reviewPeriod: number;
}

export interface DemandModel {
  baseDemand: number;
  demandStdDev: number;
  demandShock?: { round: number; delta: number };
  reportedDemandNoiseStdDev: number;
}

export interface Capacities {
  supplierMaxShip: number;
  factoryMaxProd: number;
  dcMaxShip: number;
}

export interface Costs {
  holdingCostPerUnit: number;
  stockoutCostPerUnit: number;
  orderCostFixed: number;
  orderCostPerUnit: number;
}

export interface InitialInventory {
  factory: number;
  whA: number;
  whB: number;
  dc: number;
}

export interface PolicyHelpers {
  targetServiceLevel: number;
  safetyFactorK: number;
  forecastWindow: number;
}

export interface Scenario {
  scenarioId: string;
  title: string;
  rounds: number;
  seed: number;
  leadTimeOrder: number;
  leadTimeTransfer: number;
  reviewPeriod: number;
  baseDemand: number;
  demandStdDev: number;
  demandShock?: { round: number; delta: number };
  reportedDemandNoiseStdDev: number;
  supplierMaxShip: number;
  factoryMaxProd: number;
  dcMaxShip: number;
  holdingCostPerUnit: number;
  stockoutCostPerUnit: number;
  orderCostFixed: number;
  orderCostPerUnit: number;
  initialInventory: InitialInventory;
  targetServiceLevel: number;
  safetyFactorK: number;
  forecastWindow: number;
}

/** Default scenario for Supply chain planning template */
export const DEFAULT_SCENARIO: Scenario = {
  scenarioId: 'supply-chain-planning-1',
  title: 'Supply chain planning',
  rounds: 5,
  seed: 42,
  leadTimeOrder: 2,
  leadTimeTransfer: 1,
  reviewPeriod: 1,
  baseDemand: 100,
  demandStdDev: 12,
  reportedDemandNoiseStdDev: 10,
  supplierMaxShip: 200,
  factoryMaxProd: 150,
  dcMaxShip: 150,
  holdingCostPerUnit: 2,
  stockoutCostPerUnit: 15,
  orderCostFixed: 100,
  orderCostPerUnit: 3,
  initialInventory: { factory: 80, whA: 45, whB: 35, dc: 60 },
  targetServiceLevel: 0.95,
  safetyFactorK: 1.64,
  forecastWindow: 3,
};

/** Seeded RNG for reproducible demand (simple LCG) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller for normal variate */
function normal(rng: () => number, mean: number, stdDev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export interface GameState {
  round: number;
  invFactory: number;
  invWHA: number;
  invWHB: number;
  invDC: number;
  pipeline: number[];
  cumulativeCost: number;
  historyTrueDemand: number[];
  historyReportedDemand: number[];
}

export interface StudentDecision {
  orderQty: number;
  productionPlan: number;
  splitToWHA: number; // 0–100
}

export interface RoundResult {
  round: number;
  trueDemand: number;
  reportedDemand: number;
  fulfilled: number;
  unmet: number;
  orderQty: number;
  productionPlan: number;
  splitToWHA: number;
  invFactory: number;
  invWHA: number;
  invWHB: number;
  invDC: number;
  pipeline: number[];
  roundCost: number;
  cumulativeCost: number;
  holdingCost: number;
  stockoutCost: number;
  orderingCost: number;
}

export function initialState(scenario: Scenario): GameState {
  const L = scenario.leadTimeOrder;
  return {
    round: 1,
    invFactory: scenario.initialInventory.factory,
    invWHA: scenario.initialInventory.whA,
    invWHB: scenario.initialInventory.whB,
    invDC: scenario.initialInventory.dc,
    pipeline: Array(L).fill(0),
    cumulativeCost: 0,
    historyTrueDemand: [],
    historyReportedDemand: [],
  };
}

export function simulateNextRound(
  state: GameState,
  decision: StudentDecision,
  scenario: Scenario,
): { nextState: GameState; result: RoundResult } {
  const rng = seededRandom(scenario.seed + state.round * 1000);
  const L = scenario.leadTimeOrder;

  // Step 0 — Demand
  let trueDemand = scenario.baseDemand + normal(rng, 0, scenario.demandStdDev);
  if (scenario.demandShock && state.round === scenario.demandShock.round) {
    trueDemand += scenario.demandShock.delta;
  }
  trueDemand = Math.max(0, Math.round(trueDemand));
  const reportedDemand = Math.max(0, Math.round(trueDemand + normal(rng, 0, scenario.reportedDemandNoiseStdDev)));

  // Step 1 — Pipeline
  const arrivingToFactory = state.pipeline[0] ?? 0;
  const newPipeline: number[] = [];
  for (let i = 0; i < L - 1; i++) newPipeline[i] = state.pipeline[i + 1] ?? 0;
  newPipeline[L - 1] = Math.min(Math.max(0, decision.orderQty), scenario.supplierMaxShip);

  // Step 2 — Factory
  const factoryAvailable = state.invFactory + arrivingToFactory;
  const planned = Math.min(Math.max(0, decision.productionPlan), scenario.factoryMaxProd);
  const actualFactoryOutput = Math.min(planned, factoryAvailable);
  const invFactoryNew = factoryAvailable - actualFactoryOutput;

  // Step 3 — To WH_A and WH_B
  const split = Math.max(0, Math.min(100, decision.splitToWHA)) / 100;
  const toWHA = Math.round(actualFactoryOutput * split);
  const toWHB = actualFactoryOutput - toWHA;
  const invWHANew = state.invWHA + toWHA;
  const invWHBNew = state.invWHB + toWHB;

  // Step 4 — Skip WH_A → WH_B consolidation for MVP (transferABMax = 0)

  // Step 5 — WH_B → DC (simplified: move all WH_B to DC for MVP, or cap; here we keep DC fed from both)
  const shipToDC = Math.min(invWHBNew, 200); // simple cap
  const invWHBAfterDC = invWHBNew - shipToDC;
  const invDCBeforeFulfill = state.invDC + shipToDC;

  // Step 6 — DC fulfills customer
  const maxShip = scenario.dcMaxShip;
  const canShip = Math.min(invDCBeforeFulfill, maxShip);
  const fulfilled = Math.min(canShip, trueDemand);
  const unmet = trueDemand - fulfilled;
  const invDCNew = invDCBeforeFulfill - fulfilled;

  // Step 7 — Costs
  const holding = scenario.holdingCostPerUnit * (invWHANew + invWHBAfterDC + invDCNew);
  const stockout = scenario.stockoutCostPerUnit * unmet;
  const ordering = (decision.orderQty > 0 ? scenario.orderCostFixed : 0) + scenario.orderCostPerUnit * decision.orderQty;
  const roundCost = holding + stockout + ordering;
  const cumulativeCost = state.cumulativeCost + roundCost;

  const nextState: GameState = {
    round: state.round + 1,
    invFactory: Math.max(0, invFactoryNew),
    invWHA: Math.max(0, invWHANew),
    invWHB: Math.max(0, invWHBAfterDC),
    invDC: Math.max(0, invDCNew),
    pipeline: newPipeline,
    cumulativeCost,
    historyTrueDemand: [...state.historyTrueDemand, trueDemand],
    historyReportedDemand: [...state.historyReportedDemand, reportedDemand],
  };

  const result: RoundResult = {
    round: state.round,
    trueDemand,
    reportedDemand,
    fulfilled,
    unmet,
    orderQty: decision.orderQty,
    productionPlan: decision.productionPlan,
    splitToWHA: decision.splitToWHA,
    invFactory: nextState.invFactory,
    invWHA: nextState.invWHA,
    invWHB: nextState.invWHB,
    invDC: nextState.invDC,
    pipeline: [...newPipeline],
    roundCost,
    cumulativeCost,
    holdingCost: holding,
    stockoutCost: stockout,
    orderingCost: ordering,
  };

  return { nextState, result };
}

/** Directed ordering: forecast, lead-time demand, safety stock, S, recommended order */
export function getDirectedOrdering(
  scenario: Scenario,
  state: GameState,
  reportedHistory: number[],
): { forecast: number; leadTimeDemand: number; safetyStock: number; S: number; inventoryPosition: number; recommendedOrder: number } {
  const window = Math.min(scenario.forecastWindow, reportedHistory.length || 1);
  const forecast = window > 0
    ? reportedHistory.slice(-window).reduce((a, b) => a + b, 0) / window
    : scenario.baseDemand;
  const leadTimeDemand = forecast * scenario.leadTimeOrder;
  const safetyStock = scenario.safetyFactorK * scenario.demandStdDev * Math.sqrt(scenario.leadTimeOrder);
  const S = leadTimeDemand + safetyStock;
  const pipelineSum = state.pipeline.reduce((a, b) => a + b, 0);
  const inventoryPosition = state.invFactory + state.invWHA + state.invWHB + state.invDC + pipelineSum;
  const recommendedOrder = Math.max(0, Math.round(S - inventoryPosition));
  return { forecast, leadTimeDemand, safetyStock, S, inventoryPosition, recommendedOrder };
}
