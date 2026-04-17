import { describe, expect, test } from "vitest";

import { Phase } from "../killchain/rules.js";
import { heavyFoot } from "../killchain/units.js";
import { mapsAdapter } from "../state/maps.js";
import { selectAllUnits, selectBattle } from "../state/selectors.js";
import type { SideEntity } from "../state/sides.js";
import { sidesAdapter } from "../state/sides.js";
import { makeStore } from "../state/store.js";
import type { UnitEntity } from "../state/units.js";
import { unitsAdapter } from "../state/units.js";
import {
  defaultBattleState,
  makeGridMap,
  makeSide,
  makeUnit,
} from "../testHelpers.js";
import { aiMelee, aiMissile, aiMove, aiPlacement } from "./phases.js";
import { AI_CONFIGS } from "./types.js";

const testMap = makeGridMap(20, 20);

function makeAiStore(
  units: UnitEntity[],
  sides: SideEntity[],
  phase: Phase,
  canPass = true,
) {
  return makeStore({
    battle: {
      ...defaultBattleState,
      phase,
      mapId: testMap.id,
      sideOrder: sides.map((s) => s.id),
      sideIndex: 0,
      canPass,
      turn: 1,
    },
    maps: mapsAdapter.setAll(mapsAdapter.getInitialState(), [testMap]),
    sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sides),
    units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
  });
}

// ---------------------------------------------------------------------------
// aiPlacement
// ---------------------------------------------------------------------------

describe("aiPlacement", () => {
  test("places an unplaced unit on the board", () => {
    const unit = makeUnit({ side: 0, x: NaN, y: NaN });
    const side = makeSide(0, { unplacedIds: [unit.id] });
    const store = makeAiStore([unit], [side], Phase.Placement, false);

    store.dispatch(aiPlacement(side));

    const placed = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(isNaN(placed.x)).toBe(false);
    expect(isNaN(placed.y)).toBe(false);
  });

  test("places unit within deployment zone when one is defined", () => {
    const unit = makeUnit({ side: 0, x: NaN, y: NaN });
    const zone = { x: 0, y: 0, width: 5, height: 5 };
    const side = makeSide(0, { unplacedIds: [unit.id], deploymentZone: zone });
    const store = makeAiStore([unit], [side], Phase.Placement, false);

    store.dispatch(aiPlacement(side));

    const placed = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(placed.x).toBeGreaterThanOrEqual(0);
    expect(placed.x).toBeLessThan(5);
    expect(placed.y).toBeGreaterThanOrEqual(0);
    expect(placed.y).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// aiMove
// ---------------------------------------------------------------------------

describe("aiMove", () => {
  test("Normal unit advances toward enemy", () => {
    const friendly = makeUnit({ side: 0, x: 0, y: 0 });
    const enemy = makeUnit({ side: 1, x: 10, y: 0 });
    const store = makeAiStore(
      [friendly, enemy],
      [makeSide(0), makeSide(1)],
      Phase.Move,
    );

    const distBefore = 10; // abs(0-10) + abs(0-0)
    store.dispatch(aiMove(makeSide(0), AI_CONFIGS.aggressive));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === friendly.id,
    )!;
    const distAfter = Math.abs(updated.x - 10) + Math.abs(updated.y - 0);
    expect(distAfter).toBeLessThan(distBefore);
  });

  test("fully-moved unit is not moved again", () => {
    const friendly = makeUnit({ side: 0, x: 0, y: 0, moved: heavyFoot.move });
    const enemy = makeUnit({ side: 1, x: 10, y: 0 });
    const store = makeAiStore(
      [friendly, enemy],
      [makeSide(0), makeSide(1)],
      Phase.Move,
    );

    store.dispatch(aiMove(makeSide(0), AI_CONFIGS.aggressive));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === friendly.id,
    )!;
    expect(updated.x).toBe(0);
    expect(updated.y).toBe(0);
  });

  test("Shaken unit adjacent to enemy retreats to a non-adjacent cell", () => {
    const shaken = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 6, y: 5 }); // dist=1
    const store = makeAiStore(
      [shaken, enemy],
      [makeSide(0), makeSide(1)],
      Phase.Move,
    );

    store.dispatch(aiMove(makeSide(0), AI_CONFIGS.aggressive));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === shaken.id,
    )!;
    const distAfter = Math.abs(updated.x - 6) + Math.abs(updated.y - 5);
    expect(distAfter).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// aiMelee
// ---------------------------------------------------------------------------

describe("aiMelee", () => {
  test("ready unit attacks an adjacent enemy (unit becomes not-ready)", () => {
    const attacker = makeUnit({ side: 0, x: 2, y: 2, ready: true });
    const defender = makeUnit({ side: 1, x: 2, y: 3 });
    const store = makeAiStore(
      [attacker, defender],
      [makeSide(0), makeSide(1)],
      Phase.Melee,
    );

    store.dispatch(aiMelee(makeSide(0), AI_CONFIGS.aggressive));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === attacker.id,
    )!;
    expect(updated.ready).toBe(false);
    expect(selectBattle(store.getState()).messages.length).toBeGreaterThan(0);
  });

  test("unit with ready=false does not attack", () => {
    const attacker = makeUnit({ side: 0, x: 2, y: 2, ready: false });
    const defender = makeUnit({ side: 1, x: 2, y: 3 });
    const store = makeAiStore(
      [attacker, defender],
      [makeSide(0), makeSide(1)],
      Phase.Melee,
    );

    store.dispatch(aiMelee(makeSide(0), AI_CONFIGS.aggressive));

    expect(selectBattle(store.getState()).messages).toHaveLength(0);
  });

  test("non-adjacent enemy is not attacked", () => {
    const attacker = makeUnit({ side: 0, x: 0, y: 0, ready: true });
    const far = makeUnit({ side: 1, x: 5, y: 5 });
    const store = makeAiStore(
      [attacker, far],
      [makeSide(0), makeSide(1)],
      Phase.Melee,
    );

    store.dispatch(aiMelee(makeSide(0), AI_CONFIGS.aggressive));

    expect(selectBattle(store.getState()).messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// aiMissile
// ---------------------------------------------------------------------------

describe("aiMissile", () => {
  test("missile unit attacks an in-range enemy (unit becomes not-ready)", () => {
    // dist = 5 cells × 10 ft = 50 ft; longRangeMax=120ft, cellSize=10ft → valid range
    const archer = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      missile: true,
      ready: true,
    });
    const target = makeUnit({ side: 1, x: 5, y: 0 });
    const store = makeAiStore(
      [archer, target],
      [makeSide(0), makeSide(1)],
      Phase.Missile,
    );

    store.dispatch(aiMissile(makeSide(0)));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === archer.id,
    )!;
    expect(updated.ready).toBe(false);
  });

  test("non-missile unit does not fire in missile phase", () => {
    const infantry = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      missile: false,
      ready: true,
    });
    const target = makeUnit({ side: 1, x: 5, y: 0 });
    const store = makeAiStore(
      [infantry, target],
      [makeSide(0), makeSide(1)],
      Phase.Missile,
    );

    store.dispatch(aiMissile(makeSide(0)));

    expect(selectBattle(store.getState()).messages).toHaveLength(0);
  });

  test("allied unit is not targeted by missile fire", () => {
    const archer = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      missile: true,
      ready: true,
    });
    const ally = makeUnit({ side: 1, x: 5, y: 0 });
    const store = makeAiStore(
      [archer, ally],
      [makeSide(0, { allianceId: 1 }), makeSide(1, { allianceId: 1 })],
      Phase.Missile,
    );

    store.dispatch(aiMissile(makeSide(0, { allianceId: 1 })));

    expect(selectBattle(store.getState()).messages).toHaveLength(0);
  });
});
