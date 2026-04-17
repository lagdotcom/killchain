import { test } from "vitest";

import type { Cells, Feet, MapId, SideId, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { MoraleStatus } from "../killchain/types.js";
import { lightFoot, lightHorse, mediumFoot } from "../killchain/units.js";
import { generateGridMap } from "../sampleData.js";
import type { SideSetup } from "../state/actions.js";
import { setupBattleAction } from "../state/actions.js";
import { mapsAdapter } from "../state/maps.js";
import { selectAllUnits, selectPhase, selectTurn } from "../state/selectors.js";
import { makeStore } from "../state/store.js";
import type { UnitEntity } from "../state/units.js";
import { runAiTurn } from "./index.js";
import type { AiPersonality } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleSetup {
  side0Name: string;
  side0Personality: AiPersonality;
  side1Name: string;
  side1Personality: AiPersonality;
  army0: UnitTemplate[];
  army1: UnitTemplate[];
  mapSeed?: number;
  maxIter?: number;
}

export interface UnitTemplate {
  name: string;
  type: UnitEntity["type"];
  missile?: boolean;
}

export interface SideResult {
  name: string;
  personality: string;
  initialUnits: number;
  survivingUnits: number;
}

export interface BattleResult {
  outcome: "victory" | "rout" | "timeout";
  winner: 0 | 1 | null; // side index of winner, or null
  turns: number;
  sides: [SideResult, SideResult];
}

// ---------------------------------------------------------------------------
// runBattle
// ---------------------------------------------------------------------------

export function runBattle(setup: BattleSetup): BattleResult {
  const {
    side0Name,
    side0Personality,
    side1Name,
    side1Personality,
    army0,
    army1,
    mapSeed,
    maxIter = 500,
  } = setup;

  const map = generateGridMap(
    "sim" as MapId,
    10 as Feet,
    20 as Cells,
    20 as Cells,
    mapSeed,
  );

  const sides: SideSetup[] = [
    {
      id: 0 as SideId,
      name: side0Name,
      colour: "#48f",
      aiPersonality: side0Personality,
    },
    {
      id: 1 as SideId,
      name: side1Name,
      colour: "#f44",
      aiPersonality: side1Personality,
    },
  ];

  const buildUnits = (
    templates: UnitTemplate[],
    sideId: SideId,
  ): UnitEntity[] =>
    templates.map((t, i) => ({
      id: `s${sideId}-${i}` as UnitId,
      name: t.name,
      type: t.type,
      ...(t.missile !== undefined && { missile: t.missile }),
      side: sideId,
      x: NaN as Cells,
      y: NaN as Cells,
      flankCount: 0,
      damage: 0,
      moved: 0 as Feet,
      status: "Normal" as MoraleStatus,
      ready: false,
    }));

  const units: UnitEntity[] = [
    ...buildUnits(army0, 0 as SideId),
    ...buildUnits(army1, 1 as SideId),
  ];

  const store = makeStore({
    maps: mapsAdapter.setAll(mapsAdapter.getInitialState(), [map]),
  });
  store.dispatch(setupBattleAction({ map: map.id, sides, units }));

  for (let i = 0; i < maxIter; i++) {
    if (selectPhase(store.getState()) === Phase.Completed) break;
    store.dispatch(runAiTurn());
  }

  const finalState = store.getState();
  const phase = selectPhase(finalState);
  const turns = selectTurn(finalState);
  const allUnits = selectAllUnits(finalState);

  const survivors0 = allUnits.filter(
    (u) => u.side === (0 as SideId) && u.status !== "Rout",
  ).length;
  const survivors1 = allUnits.filter(
    (u) => u.side === (1 as SideId) && u.status !== "Rout",
  ).length;

  let outcome: BattleResult["outcome"];
  let winner: 0 | 1 | null;

  if (phase !== Phase.Completed) {
    outcome = "timeout";
    winner = null;
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
        name: side0Name,
        personality: side0Personality,
        initialUnits: army0.length,
        survivingUnits: survivors0,
      },
      {
        name: side1Name,
        personality: side1Personality,
        initialUnits: army1.length,
        survivingUnits: survivors1,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Standard army compositions
// ---------------------------------------------------------------------------

const standardArmy: UnitTemplate[] = [
  { name: "Cavalry", type: lightHorse },
  { name: "Infantry", type: mediumFoot },
  { name: "Archers", type: lightFoot, missile: true },
];

// ---------------------------------------------------------------------------
// main — aggregate stats across N battles per matchup
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

function main(n = 50) {
  type Personality = AiPersonality;
  const personalities: Personality[] = ["aggressive", "defensive", "berserker"];

  const matchups: [Personality, Personality][] = [];
  for (let i = 0; i < personalities.length; i++) {
    for (let j = i; j < personalities.length; j++) {
      matchups.push([personalities[i]!, personalities[j]!]);
    }
  }

  for (const [p0, p1] of matchups) {
    const results: BattleResult[] = [];
    for (let i = 0; i < n; i++) {
      results.push(
        runBattle({
          side0Name: p0,
          side0Personality: p0,
          side1Name: p1,
          side1Personality: p1,
          army0: standardArmy,
          army1: standardArmy,
          mapSeed: i,
        }),
      );
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

    const label = p0 === p1 ? `${p0} mirror` : `${p0} vs ${p1}`;
    console.log(`\n${label} (${n} battles)`);
    console.log(
      `  ${p0.padEnd(12)} wins: ${String(wins0).padStart(3)} ${pct(wins0, n)}  avg survivors: ${avgSurv0}`,
    );
    console.log(
      `  ${p1.padEnd(12)} wins: ${String(wins1).padStart(3)} ${pct(wins1, n)}  avg survivors: ${avgSurv1}`,
    );
    console.log(
      `  Avg turns: ${avgTurns}  Routs: ${routs}  Timeouts: ${timeouts}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Vitest entry — run via: npm run simulate
// ---------------------------------------------------------------------------

test("AI battle simulation", () => {
  main();
});
