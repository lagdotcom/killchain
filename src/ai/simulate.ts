import { readFileSync, writeFileSync } from "fs";

import type { MapId, SideId, VictoryPoints } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { UnitDefinition } from "../killchain/types.js";
import {
  heavyFoot,
  heavyHorse,
  lightFoot,
  lightHorse,
  mediumFoot,
  mediumHorse,
  unarmouredTroops,
} from "../killchain/units.js";
import { generateGridMap } from "../sampleData.js";
import { loadScenarioAction } from "../state/actions.js";
import { mapsAdapter } from "../state/maps.js";
import { rosterAdapter } from "../state/roster.js";
import type { Scenario, VictoryZone } from "../state/scenarios.js";
import {
  selectAllUnits,
  selectBattle,
  selectFinalVP,
  selectPhase,
  selectTurn,
} from "../state/selectors.js";
import { makeStore } from "../state/store.js";
import { runAiTurn } from "./index.js";
import type { AiPersonality } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleSetup {
  scenario: Scenario;
  /** Extra definitions merged with SIM_DEFINITIONS (for custom JSON scenarios). */
  definitions?: UnitDefinition[];
  side0Personality: AiPersonality;
  side1Personality: AiPersonality;
  mapSeed?: number;
  maxIter?: number;
}

export interface SideResult {
  name: string;
  personality: string;
  initialUnits: number;
  survivingUnits: number;
}

export interface BattleResult {
  outcome: "victory" | "rout" | "timeout";
  winner: 0 | 1 | null; // side index, or null on rout/draw/timeout
  turns: number;
  sides: [SideResult, SideResult];
  vp?: Partial<Record<SideId, VictoryPoints>>;
}

export interface LogEntry {
  scenario: string;
  seed: number;
  side0Personality: AiPersonality;
  side1Personality: AiPersonality;
  result: BattleResult;
}

// ---------------------------------------------------------------------------
// Built-in unit definition roster
// ---------------------------------------------------------------------------

export const SIM_DEFINITIONS: UnitDefinition[] = [
  { id: "sim-unarmoured", type: unarmouredTroops },
  { id: "sim-light-foot", type: lightFoot },
  { id: "sim-medium-foot", type: mediumFoot },
  { id: "sim-heavy-foot", type: heavyFoot },
  { id: "sim-light-horse", type: lightHorse },
  { id: "sim-medium-horse", type: mediumHorse },
  { id: "sim-heavy-horse", type: heavyHorse },
  // aliases matching the game's default roster IDs
  { id: "def-light-foot", type: lightFoot },
  { id: "def-medium-foot", type: mediumFoot },
  { id: "def-light-horse", type: lightHorse },
  { id: "def-heavy-horse", type: heavyHorse },
];

// ---------------------------------------------------------------------------
// Built-in named scenarios (Scenario format)
// ---------------------------------------------------------------------------

const SIM_MAP_ID: MapId = "sim";

const VILLAGE_ZONE: VictoryZone = { x: 7, y: 7, width: 6, height: 6 };

export const SCENARIOS: Record<string, Scenario> = {
  standard: {
    id: "sim-standard",
    name: "Standard",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Blue",
        colour: "#48f",
        units: [
          { definitionId: "sim-light-horse", name: "Cavalry" },
          { definitionId: "sim-medium-foot", name: "Infantry" },
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
        ],
      },
      {
        id: 1,
        name: "Red",
        colour: "#f44",
        units: [
          { definitionId: "sim-light-horse", name: "Cavalry" },
          { definitionId: "sim-medium-foot", name: "Infantry" },
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
        ],
      },
    ],
  },
  infantry: {
    id: "sim-infantry",
    name: "Heavy Foot",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Blue",
        colour: "#48f",
        units: [
          { definitionId: "sim-heavy-foot", name: "Spears" },
          { definitionId: "sim-heavy-foot", name: "Spears" },
          { definitionId: "sim-heavy-foot", name: "Spears" },
        ],
      },
      {
        id: 1,
        name: "Red",
        colour: "#f44",
        units: [
          { definitionId: "sim-heavy-foot", name: "Spears" },
          { definitionId: "sim-heavy-foot", name: "Spears" },
          { definitionId: "sim-heavy-foot", name: "Spears" },
        ],
      },
    ],
  },
  cavalry: {
    id: "sim-cavalry",
    name: "Heavy Cavalry",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Blue",
        colour: "#48f",
        units: [
          { definitionId: "sim-heavy-horse", name: "Knights" },
          { definitionId: "sim-heavy-horse", name: "Knights" },
          { definitionId: "sim-heavy-horse", name: "Knights" },
        ],
      },
      {
        id: 1,
        name: "Red",
        colour: "#f44",
        units: [
          { definitionId: "sim-heavy-horse", name: "Knights" },
          { definitionId: "sim-heavy-horse", name: "Knights" },
          { definitionId: "sim-heavy-horse", name: "Knights" },
        ],
      },
    ],
  },
  ranged: {
    id: "sim-ranged",
    name: "Ranged Heavy",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Blue",
        colour: "#48f",
        units: [
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
          { definitionId: "sim-light-horse", name: "Scouts" },
        ],
      },
      {
        id: 1,
        name: "Red",
        colour: "#f44",
        units: [
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
          { definitionId: "sim-light-horse", name: "Scouts" },
        ],
      },
    ],
  },
  asymmetric: {
    id: "sim-asymmetric",
    name: "Asymmetric",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Raiders",
        colour: "#48f",
        units: [
          { definitionId: "sim-light-horse", name: "Raiders" },
          { definitionId: "sim-light-horse", name: "Raiders" },
          { definitionId: "sim-medium-horse", name: "Heavy Raiders" },
        ],
      },
      {
        id: 1,
        name: "Shield Wall",
        colour: "#f44",
        units: [
          { definitionId: "sim-heavy-foot", name: "Shield Wall" },
          { definitionId: "sim-heavy-foot", name: "Shield Wall" },
          { definitionId: "sim-medium-foot", name: "Crossbows", missile: true },
        ],
      },
    ],
  },
  "raiders-vs-village": {
    id: "sim-raiders-vs-village",
    name: "Raiders vs Village",
    mapId: SIM_MAP_ID,
    sides: [
      {
        id: 0,
        name: "Raiders",
        colour: "#f80",
        deploymentZone: { x: 0, y: 0, width: 20, height: 5 },
        units: [
          { definitionId: "sim-light-horse", name: "Riders" },
          { definitionId: "sim-light-horse", name: "Outriders" },
          { definitionId: "sim-medium-horse", name: "Horsemen" },
          { definitionId: "sim-light-horse", name: "Flankers" },
        ],
      },
      {
        id: 1,
        name: "Villagers",
        colour: "#48f",
        deploymentZone: { x: 7, y: 7, width: 6, height: 6 },
        units: [
          { definitionId: "sim-heavy-foot", name: "Militia" },
          { definitionId: "sim-heavy-foot", name: "Militia" },
          { definitionId: "sim-light-foot", name: "Archers", missile: true },
        ],
      },
    ],
    rules: { turnLimit: 8 },
    victoryConditions: [
      { type: "zone_held_turns", zone: VILLAGE_ZONE, sideId: 0, points: 3 },
      { type: "control_zone", zone: VILLAGE_ZONE, sideId: 0, points: 5 },
      { type: "units_destroyed", sideId: 0, points: 2 },
      { type: "zone_held_turns", zone: VILLAGE_ZONE, sideId: 1, points: 3 },
      { type: "turns_survived", sideId: 1, points: 8 },
      { type: "units_destroyed", sideId: 1, points: 1 },
    ],
  },
};

// ---------------------------------------------------------------------------
// runBattle
// ---------------------------------------------------------------------------

export function runBattle(setup: BattleSetup): BattleResult {
  const {
    scenario,
    definitions = [],
    side0Personality,
    side1Personality,
    mapSeed,
    maxIter = 500,
  } = setup;

  const map = generateGridMap(SIM_MAP_ID, 10, 20, 20, mapSeed);

  // Patch the scenario: fix mapId and inject personalities for this matchup.
  const patchedScenario: Scenario = {
    ...scenario,
    mapId: map.id,
    sides: scenario.sides.map((side, i) => ({
      ...side,
      aiPersonality: i === 0 ? side0Personality : side1Personality,
    })),
  };

  const allDefs = [...SIM_DEFINITIONS, ...definitions];
  const store = makeStore({
    maps: mapsAdapter.setAll(mapsAdapter.getInitialState(), [map]),
    roster: rosterAdapter.setAll(rosterAdapter.getInitialState(), allDefs),
  });
  store.dispatch(loadScenarioAction(patchedScenario));

  for (let i = 0; i < maxIter; i++) {
    if (selectPhase(store.getState()) === Phase.Completed) break;
    store.dispatch(runAiTurn());
  }

  const finalState = store.getState();
  const phase = selectPhase(finalState);
  const turns = selectTurn(finalState);
  const allUnits = selectAllUnits(finalState);
  const finalVP = selectFinalVP(finalState);
  const finalBattle = selectBattle(finalState);

  const survivors0 = allUnits.filter(
    (u) => u.side === 0 && u.status !== "Rout",
  ).length;
  const survivors1 = allUnits.filter(
    (u) => u.side === 1 && u.status !== "Rout",
  ).length;

  const side0 = patchedScenario.sides[0]!;
  const side1 = patchedScenario.sides[1]!;

  let outcome: BattleResult["outcome"];
  let winner: 0 | 1 | null;

  const turnLimitReached =
    finalBattle.turnLimit !== undefined &&
    finalBattle.turn >= finalBattle.turnLimit &&
    survivors0 > 0 &&
    survivors1 > 0;

  if (phase !== Phase.Completed) {
    outcome = "timeout";
    winner = null;
  } else if (turnLimitReached) {
    outcome = "timeout";
    const vpSide0 = finalVP?.[side0.id] ?? 0;
    const vpSide1 = finalVP?.[side1.id] ?? 0;
    winner = vpSide0 > vpSide1 ? 0 : vpSide1 > vpSide0 ? 1 : null;
  } else if (survivors0 === 0 && survivors1 === 0) {
    outcome = "rout";
    winner = null;
  } else if (survivors0 > 0 && survivors1 === 0) {
    outcome = "victory";
    winner = 0;
  } else if (survivors1 > 0 && survivors0 === 0) {
    outcome = "victory";
    winner = 1;
  } else {
    outcome = "victory";
    winner = null;
  }

  return {
    outcome,
    winner,
    turns,
    sides: [
      {
        name: side0.name,
        personality: side0Personality,
        initialUnits: side0.units.length,
        survivingUnits: survivors0,
      },
      {
        name: side1.name,
        personality: side1Personality,
        initialUnits: side1.units.length,
        survivingUnits: survivors1,
      },
    ],
    ...(finalVP !== undefined && { vp: finalVP }),
  };
}

// ---------------------------------------------------------------------------
// JSON file loading
// ---------------------------------------------------------------------------

interface ScenarioFile {
  scenario: Scenario;
  definitions?: UnitDefinition[];
}

function loadScenarioFile(filePath: string): {
  scenario: Scenario;
  definitions: UnitDefinition[];
} {
  const raw = readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (parsed !== null && typeof parsed === "object" && "scenario" in parsed) {
    const file = parsed as ScenarioFile;
    return { scenario: file.scenario, definitions: file.definitions ?? [] };
  }

  // Plain Scenario object.
  return { scenario: parsed as Scenario, definitions: [] };
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function pct(n: number, total: number) {
  return total === 0
    ? "  -"
    : `${Math.round((n / total) * 100)
        .toString()
        .padStart(3)}%`;
}

function avg(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((a, b) => a + b, 0) / values.length;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  // --battles N  or  -n N
  let n = 50;
  const battlesIdx = args.findIndex((a) => a === "--battles" || a === "-n");
  if (battlesIdx !== -1) {
    const val = parseInt(args[battlesIdx + 1] ?? "", 10);
    if (!isNaN(val) && val > 0) n = val;
    args.splice(battlesIdx, 2);
  }

  // --log <file>  or  -l <file>
  let logFile: string | undefined;
  const logIdx = args.findIndex((a) => a === "--log" || a === "-l");
  if (logIdx !== -1) {
    logFile = args[logIdx + 1];
    args.splice(logIdx, 2);
  }

  const arg = args[0] ?? "standard";

  if (arg === "list") {
    console.log("Built-in scenarios:");
    const descs: Record<string, string> = {
      standard: "Mixed arms: cavalry, medium foot, archers",
      infantry: "Heavy foot-only armies",
      cavalry: "Heavy horse-only armies",
      ranged: "Two archer units and light horse",
      asymmetric: "Cavalry raiders vs heavy foot shield wall",
      "raiders-vs-village":
        "4 horse raiders vs 3 village defenders; VP + turn limit",
    };
    for (const [name, desc] of Object.entries(descs)) {
      console.log(`  ${name.padEnd(14)} ${desc}`);
    }
    console.log(
      "\nOr pass a path to a scenario JSON file (plain Scenario or { scenario, definitions? }).",
    );
    process.exit(0);
  }

  let scenario: Scenario;
  let extraDefs: UnitDefinition[] = [];

  if (arg.endsWith(".json") || arg.startsWith("/") || arg.startsWith(".")) {
    const loaded = loadScenarioFile(arg);
    scenario = loaded.scenario;
    extraDefs = loaded.definitions;
    console.log(`\nScenario file: ${arg} — ${scenario.name}`);
  } else {
    const found = SCENARIOS[arg];
    if (!found) {
      console.error(
        `Unknown scenario "${arg}". Run with "list" to see available scenarios.`,
      );
      process.exit(1);
    }
    scenario = found;
    console.log(`\nScenario: ${arg} — ${scenario.name}`);
  }

  console.log(`Battles per matchup: ${n}\n`);

  const sideId0 = scenario.sides[0]!.id;
  const sideId1 = scenario.sides[1]!.id;
  const sideName0 = scenario.sides[0]!.name;
  const sideName1 = scenario.sides[1]!.name;
  const allEntries: LogEntry[] = [];

  type Personality = AiPersonality;
  const personalities: Personality[] = [
    "aggressive",
    "defensive",
    "berserker",
    "tactical",
    "skirmisher",
  ];

  const matchups: [Personality, Personality][] = [];
  for (let i = 0; i < personalities.length; i++) {
    for (let j = i; j < personalities.length; j++) {
      matchups.push([personalities[i]!, personalities[j]!]);
    }
  }

  for (const [p0, p1] of matchups) {
    const results: BattleResult[] = [];
    for (let i = 0; i < n; i++) {
      const result = runBattle({
        scenario,
        definitions: extraDefs,
        side0Personality: p0,
        side1Personality: p1,
        mapSeed: i,
      });
      results.push(result);
      allEntries.push({
        scenario: arg,
        seed: i,
        side0Personality: p0,
        side1Personality: p1,
        result,
      });
    }

    const wins0 = results.filter((r) => r.winner === 0).length;
    const wins1 = results.filter((r) => r.winner === 1).length;
    const routs = results.filter((r) => r.outcome === "rout").length;
    const timeouts = results.filter((r) => r.outcome === "timeout").length;
    const victories = results.filter((r) => r.outcome === "victory");

    const avgTurns = avg(victories.map((r) => r.turns)).toFixed(1);
    const avgSurv0 = avg(
      victories.map((r) => r.sides[0].survivingUnits),
    ).toFixed(1);
    const avgSurv1 = avg(
      victories.map((r) => r.sides[1].survivingUnits),
    ).toFixed(1);

    const vpResults = results.filter((r) => r.vp !== undefined);
    const avgVP0 = avg(vpResults.map((r) => r.vp![sideId0] ?? 0));
    const avgVP1 = avg(vpResults.map((r) => r.vp![sideId1] ?? 0));

    const label = p0 === p1 ? `${p0} mirror` : `${p0} vs ${p1}`;
    console.log(`${label} (${n} battles)`);
    console.log(
      `  ${p0.padEnd(12)} wins: ${String(wins0).padStart(3)} ${pct(wins0, n)}  avg survivors: ${avgSurv0}`,
    );
    console.log(
      `  ${p1.padEnd(12)} wins: ${String(wins1).padStart(3)} ${pct(wins1, n)}  avg survivors: ${avgSurv1}`,
    );
    console.log(
      `  Avg turns: ${avgTurns}  Routs: ${routs}  Timeouts: ${timeouts}`,
    );
    if (vpResults.length > 0)
      console.log(
        `  Avg VP: ${sideName0.padEnd(12)} ${avgVP0.toFixed(1).padStart(5)}  ${sideName1.padEnd(12)} ${avgVP1.toFixed(1).padStart(5)}  (${vpResults.length}/${n} with VP)`,
      );
    console.log();
  }

  if (logFile !== undefined) {
    const log = {
      scenario: arg,
      scenarioName: scenario.name,
      battles: n,
      timestamp: new Date().toISOString(),
      entries: allEntries,
    };
    writeFileSync(logFile, JSON.stringify(log, null, 2));
    console.log(`Results saved to ${logFile}`);
  }
}

main();
