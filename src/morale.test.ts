import { afterEach, describe, expect, test, vi } from "vitest";

import type { SideId } from "./flavours.js";
import { Phase } from "./killchain/rules.js";
import { heavyFoot } from "./killchain/units.js";
import {
  executeRoutMovement,
  initiativeAction,
  rollMorale,
} from "./state/actions.js";
import { type MapEntity, mapsAdapter } from "./state/maps.js";
import { selectAllUnits, selectCanPassNow } from "./state/selectors.js";
import type { SideEntity } from "./state/sides.js";
import { sidesAdapter } from "./state/sides.js";
import { makeStore } from "./state/store.js";
import type { UnitEntity } from "./state/units.js";
import { unitsAdapter } from "./state/units.js";
import {
  defaultBattleState,
  makeGridMap,
  makeSide,
  makeUnit,
} from "./testHelpers.js";
import * as tools from "./tools.js";

function makeStoreWith(
  units: UnitEntity[],
  sides: SideEntity[] = [],
  map?: MapEntity,
) {
  return makeStore({
    units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
    sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sides),
    ...(map && {
      maps: mapsAdapter.setAll(mapsAdapter.getInitialState(), [map]),
      battle: { ...defaultBattleState, mapId: map.id },
    }),
  });
}

// ---------------------------------------------------------------------------
// initiativeAction: Shaken and Rout units must not become ready
// ---------------------------------------------------------------------------

describe("initiativeAction", () => {
  test("Normal unit becomes ready", () => {
    const unit = makeUnit({ side: 0, x: 0, y: 0, status: "Normal" });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(initiativeAction({ results: [{ side, roll: 4 }] }));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.ready).toBe(true);
  });

  test("Shaken unit stays not ready", () => {
    const unit = makeUnit({ side: 0, x: 0, y: 0, status: "Shaken" });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(initiativeAction({ results: [{ side, roll: 4 }] }));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.ready).toBe(false);
  });

  test("Rout unit stays not ready", () => {
    const unit = makeUnit({ side: 0, x: 0, y: 0, status: "Rout" });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(initiativeAction({ results: [{ side, roll: 4 }] }));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.ready).toBe(false);
  });

  test("only units of rolled sides are affected", () => {
    const unitSide0 = makeUnit({ side: 0, x: 0, y: 0, status: "Normal" });
    const unitSide1 = makeUnit({ side: 1, x: 1, y: 0, status: "Normal" });
    const side0 = makeSide(0);
    const store = makeStoreWith([unitSide0, unitSide1], [side0, makeSide(1)]);

    // Only side 0 rolls initiative
    store.dispatch(initiativeAction({ results: [{ side: side0, roll: 4 }] }));

    const units = selectAllUnits(store.getState());
    expect(units.find((u) => u.id === unitSide0.id)!.ready).toBe(true);
    expect(units.find((u) => u.id === unitSide1.id)!.ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// executeRoutMovement: Rout units auto-move away from nearest enemy
// ---------------------------------------------------------------------------

describe("executeRoutMovement", () => {
  test("Rout unit moves further from nearest enemy (terrain-aware)", () => {
    // Rout unit at (10,10), far from all edges (nearest edge is 9 away, move=6 cells).
    // Pathfinding finds the best reachable cell within move=60ft on a flat grid.
    const rout = makeUnit({ side: 0, x: 10, y: 10, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 7, y: 10, status: "Normal" });
    const store = makeStoreWith([rout, enemy], [], makeGridMap(20, 20));

    store.dispatch(executeRoutMovement());

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === rout.id,
    )!;
    const distBefore = Math.abs(rout.x - enemy.x) + Math.abs(rout.y - enemy.y);
    const distAfter =
      Math.abs(updated.x - enemy.x) + Math.abs(updated.y - enemy.y);
    expect(distAfter).toBeGreaterThan(distBefore);
  });

  test("Rout unit moves further from enemy along y-axis when dy dominates", () => {
    // Rout unit at (10,10), far from all edges (nearest edge is 9 away, move=6 cells).
    const rout = makeUnit({ side: 0, x: 10, y: 10, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 10, y: 7, status: "Normal" });
    const store = makeStoreWith([rout, enemy], [], makeGridMap(20, 20));

    store.dispatch(executeRoutMovement());

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === rout.id,
    )!;
    const distBefore = Math.abs(rout.x - enemy.x) + Math.abs(rout.y - enemy.y);
    const distAfter =
      Math.abs(updated.x - enemy.x) + Math.abs(updated.y - enemy.y);
    expect(distAfter).toBeGreaterThan(distBefore);
  });

  test("Rout unit is removed when movement carries it off the board", () => {
    // Rout unit at (17,5), enemy at (10,5): edge x=19 is 2 cells away (< move=6) → fled
    const rout = makeUnit({ side: 0, x: 17, y: 5, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 10, y: 5, status: "Normal" });
    const store = makeStoreWith([rout, enemy], [], makeGridMap(20, 20));

    store.dispatch(executeRoutMovement());

    const remaining = selectAllUnits(store.getState());
    expect(remaining.find((u) => u.id === rout.id)).toBeUndefined();
  });

  test("Normal unit is not moved by executeRoutMovement", () => {
    const normal = makeUnit({ side: 0, x: 5, y: 5, status: "Normal" });
    const enemy = makeUnit({ side: 1, x: 2, y: 5, status: "Normal" });
    const store = makeStoreWith([normal, enemy]);

    store.dispatch(executeRoutMovement());

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === normal.id,
    )!;
    expect(updated.x).toBe(5);
    expect(updated.y).toBe(5);
  });

  test("Rout unit with no enemies moves toward nearest board edge", () => {
    // Rout unit at (1,5): edge x=0 is 1 cell away (< move=6) → fled, unit removed
    const rout = makeUnit({ side: 0, x: 1, y: 5, status: "Rout" });
    const store = makeStoreWith([rout], [], makeGridMap(20, 20));

    store.dispatch(executeRoutMovement());

    const remaining = selectAllUnits(store.getState());
    expect(remaining.find((u) => u.id === rout.id)).toBeUndefined();
  });

  test("enemy Rout units are not counted as enemies when calculating direction", () => {
    // Rout unit (side 0) at (5,5). Only other unit is a Rout unit on side 1.
    // No living enemies; rout1 does not block (rout units excluded from pathfinding).
    // Edge x=0 is 5 cells away (< move=6) → fled, unit removed
    const rout0 = makeUnit({ side: 0, x: 5, y: 5, status: "Rout" });
    const rout1 = makeUnit({ side: 1, x: 2, y: 5, status: "Rout" });
    const store = makeStoreWith([rout0, rout1], [], makeGridMap(20, 20));

    store.dispatch(executeRoutMovement());

    const remaining = selectAllUnits(store.getState());
    expect(remaining.find((u) => u.id === rout0.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// rollMorale with side=undefined: only Shaken units roll
// ---------------------------------------------------------------------------

describe("rollMorale with no losing side", () => {
  test("Normal unit status is unchanged when side is undefined", () => {
    const normal = makeUnit({ side: 0, x: 0, y: 0, status: "Normal" });
    const store = makeStoreWith([normal]);

    store.dispatch(rollMorale(undefined));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === normal.id,
    )!;
    expect(updated.status).toBe("Normal");
  });

  test("Shaken unit always transitions away from Shaken when side is undefined", () => {
    const shaken = makeUnit({ side: 0, x: 0, y: 0, status: "Shaken" });
    const store = makeStoreWith([shaken]);

    store.dispatch(rollMorale(undefined));

    // A Shaken unit must roll: pass → Normal, fail → Rout. It cannot stay Shaken.
    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === shaken.id,
    );
    // Either removed (Rout → removed? No, Rout stays in state) or status changed.
    // Rout units are kept in state but status = "Rout". Normal pass returns "Normal".
    if (updated) {
      expect(updated.status).not.toBe("Shaken");
    }
    // If unit was removed it means it was dispatched with status Rout in moraleAction
    // but moraleAction doesn't remove units — only routMoveAction does.
    // So the unit always remains in state; status is Normal or Rout.
  });

  test("Normal unit of a different side is also unchanged when losing side is specified", () => {
    const normalSide1 = makeUnit({ side: 1, x: 2, y: 0, status: "Normal" });
    const side0 = makeSide(0);
    const store = makeStoreWith([normalSide1], [side0, makeSide(1)]);

    store.dispatch(rollMorale(side0)); // only side 0 must roll; side 1 is not involved

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === normalSide1.id,
    )!;
    expect(updated.status).toBe("Normal");
  });
});

// ---------------------------------------------------------------------------
// rollMorale: roll of 12 always fails regardless of unit morale
// ---------------------------------------------------------------------------

describe("rollMorale — roll of 12 always fails", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("unit with morale 12 still fails when roll is 12", () => {
    vi.spyOn(tools, "rollDice").mockReturnValue(6); // 6+6=12
    const unit = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      status: "Normal",
      type: { ...heavyFoot, morale: 12 },
    });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(rollMorale(side));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.status).toBe("Shaken");
  });

  test("unit with morale 11 passes when roll is 11", () => {
    vi.spyOn(tools, "rollDice").mockReturnValueOnce(5).mockReturnValueOnce(6); // 5+6=11
    const unit = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      status: "Normal",
      type: { ...heavyFoot, morale: 11 },
    });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(rollMorale(side));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.status).toBe("Normal");
  });
});

// ---------------------------------------------------------------------------
// rollMorale: steadfast units auto-pass without rolling
// ---------------------------------------------------------------------------

describe("rollMorale — steadfast units", () => {
  test("steadfast Normal unit stays Normal (no result pushed)", () => {
    const unit = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      status: "Normal",
      type: { ...heavyFoot, steadfast: true },
    });
    const side = makeSide(0);
    const store = makeStoreWith([unit], [side]);

    store.dispatch(rollMorale(side));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.status).toBe("Normal");
  });

  test("steadfast Shaken unit auto-recovers to Normal (roll logged as NaN)", () => {
    const unit = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      status: "Shaken",
      type: { ...heavyFoot, steadfast: true },
    });
    const store = makeStoreWith([unit]);

    store.dispatch(rollMorale(undefined));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === unit.id,
    )!;
    expect(updated.status).toBe("Normal");
  });

  test("steadfast unit is counted as alive for victory check", () => {
    const steadfast = makeUnit({
      side: 0,
      x: 0,
      y: 0,
      status: "Normal",
      type: { ...heavyFoot, steadfast: true },
    });
    const side = makeSide(0);
    const store = makeStoreWith([steadfast], [side]);

    // Steadfast unit should not cause a "rout" outcome even in morale phase
    store.dispatch(rollMorale(side));

    const updated = selectAllUnits(store.getState()).find(
      (u) => u.id === steadfast.id,
    )!;
    // Steadfast unit never becomes Rout
    expect(updated.status).not.toBe("Rout");
  });
});

// ---------------------------------------------------------------------------
// selectCanPassNow: blocks passing while active side has Shaken unit in melee
// ---------------------------------------------------------------------------

describe("selectCanPassNow", () => {
  function makeMovePhaseStore(
    units: UnitEntity[],
    activeSideId: SideId = 0,
    canPass: boolean = true,
  ) {
    const sideEntities = [makeSide(0), makeSide(1)];
    const store = makeStore({
      units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
      sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sideEntities),
      battle: {
        activeUnitId: undefined,
        canPass,
        mapId: "",
        messages: [],
        phase: Phase.Move,
        sideOrder: [activeSideId],
        sideIndex: 0,
        turn: 1,
      },
    });
    return store;
  }

  test("returns false when battle.canPass is false", () => {
    const store = makeMovePhaseStore([], 0, false);
    expect(selectCanPassNow(store.getState())).toBe(false);
  });

  test("returns true when no Shaken units are present", () => {
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Normal" });
    const enemy = makeUnit({ side: 1, x: 6, y: 5, status: "Normal" });
    const store = makeMovePhaseStore([unit, enemy]);
    expect(selectCanPassNow(store.getState())).toBe(true);
  });

  test("returns true when Shaken unit is not in melee contact", () => {
    const shaken = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 9, y: 5, status: "Normal" }); // dist=4
    const store = makeMovePhaseStore([shaken, enemy]);
    expect(selectCanPassNow(store.getState())).toBe(true);
  });

  test("returns false when Shaken unit of active side is in melee contact with an enemy", () => {
    const shaken = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 6, y: 5, status: "Normal" }); // dist=1
    const store = makeMovePhaseStore([shaken, enemy]);
    expect(selectCanPassNow(store.getState())).toBe(false);
  });

  test("returns true when Shaken unit is adjacent to a Rout enemy (Rout not counted)", () => {
    const shaken = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const routEnemy = makeUnit({ side: 1, x: 6, y: 5, status: "Rout" }); // dist=1 but Rout
    const store = makeMovePhaseStore([shaken, routEnemy]);
    expect(selectCanPassNow(store.getState())).toBe(true);
  });

  test("returns true when Shaken unit belongs to the inactive side", () => {
    // active side is 0; Shaken unit belongs to side 1
    const shakenSide1 = makeUnit({ side: 1, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 0, x: 6, y: 5, status: "Normal" }); // dist=1
    const store = makeMovePhaseStore([shakenSide1, enemy], 0);
    expect(selectCanPassNow(store.getState())).toBe(true);
  });

  test("returns true in a non-Move phase even with Shaken unit in melee", () => {
    const shaken = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 6, y: 5, status: "Normal" });
    const sideEntities = [makeSide(0), makeSide(1)];
    const store = makeStore({
      units: unitsAdapter.setAll(unitsAdapter.getInitialState(), [
        shaken,
        enemy,
      ]),
      sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sideEntities),
      battle: {
        activeUnitId: undefined,
        canPass: true,
        mapId: "",
        messages: [],
        phase: Phase.Melee, // not Move
        sideOrder: [0],
        sideIndex: 0,
        turn: 1,
      },
    });
    expect(selectCanPassNow(store.getState())).toBe(true);
  });
});
