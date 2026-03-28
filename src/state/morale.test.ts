import { describe, expect, test } from "vitest";

import type { Cells, SideId, TerrainId, UnitId } from "../flavours.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import { heavyFoot } from "../killchain/units.js";
import { Phase } from "../killchain/rules.js";
import {
  executeRoutMovement,
  initiativeAction,
  rollMorale,
} from "./actions.js";
import type { SideEntity } from "./sides.js";
import { sidesAdapter } from "./sides.js";
import {
  selectAllUnits,
  selectCanPassNow,
} from "./selectors.js";
import { makeStore } from "./store.js";
import type { TerrainEntity } from "./terrain.js";
import { terrainAdapter } from "./terrain.js";
import type { UnitEntity } from "./units.js";
import { unitsAdapter } from "./units.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSide(id: number): SideEntity {
  return {
    id: id as SideId,
    colour: "#fff",
    name: `Side ${id}`,
    unplacedIds: [],
    surprised: false,
    casualties: 0,
    initiative: 0,
  };
}

let _uid = 0;
function makeUnit(
  partial: Partial<UnitEntity> & { side: number; x: number; y: number },
): UnitEntity {
  return {
    id: `u${_uid++}` as UnitId,
    name: "Unit",
    type: heavyFoot, // move=6
    missile: false,
    flankCount: 0,
    damage: 0,
    moved: 0,
    status: "Normal",
    ready: false,
    ...partial,
    side: partial.side as SideId,
    x: partial.x as Cells,
    y: partial.y as Cells,
  };
}

function makeFlatTerrain(width: number, height: number): TerrainEntity[] {
  const result: TerrainEntity[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result.push({
        id: xyId(x, y) as TerrainId,
        x: x as Cells,
        y: y as Cells,
        type: "Open",
        elevation: 0,
      });
    }
  }
  return result;
}

function makeStoreWith(
  units: UnitEntity[],
  sides: SideEntity[] = [],
  terrain: TerrainEntity[] = [],
) {
  return makeStore({
    units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
    sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sides),
    terrain: terrainAdapter.setAll(terrainAdapter.getInitialState(), terrain),
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
    // Rout unit at (5,5), enemy at (2,5): straight-line away is +x, stays on board.
    // Pathfinding finds the best reachable cell within move=6 on a flat grid.
    const terrain = makeFlatTerrain(20, 20);
    const rout = makeUnit({ side: 0, x: 5, y: 5, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 2, y: 5, status: "Normal" });
    const store = makeStoreWith([rout, enemy], [], terrain);

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
    // Rout unit at (5,5), enemy at (5,2): straight-line away is +y, stays on board.
    const terrain = makeFlatTerrain(20, 20);
    const rout = makeUnit({ side: 0, x: 5, y: 5, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 5, y: 2, status: "Normal" });
    const store = makeStoreWith([rout, enemy], [], terrain);

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
    // Rout unit at (17,5), enemy at (10,5): dx=+1, speed=6 → newX=23 ≥ 20 → fled
    const rout = makeUnit({ side: 0, x: 17, y: 5, status: "Rout" });
    const enemy = makeUnit({ side: 1, x: 10, y: 5, status: "Normal" });
    const store = makeStoreWith([rout, enemy]);

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
    // Rout unit at (1,5): toLeft=1, toRight=18, toTop=5, toBottom=14 → nearest edge is left (dx=-1)
    // speed=6 → newX = 1 + (-1)*6 = -5 < 0 → fled, unit removed
    const rout = makeUnit({ side: 0, x: 1, y: 5, status: "Rout" });
    const store = makeStoreWith([rout]);

    store.dispatch(executeRoutMovement());

    const remaining = selectAllUnits(store.getState());
    expect(remaining.find((u) => u.id === rout.id)).toBeUndefined();
  });

  test("enemy Rout units are not counted as enemies when calculating direction", () => {
    // Rout unit (side 0) at (5,5). Only other unit is a Rout unit on side 1.
    // No living enemies → moves toward nearest edge.
    // toLeft=5, toRight=14, toTop=5, toBottom=14 → tie, toLeft wins → dx=-1
    // newX = 5 + (-1)*6 = -1 < 0 → fled
    const rout0 = makeUnit({ side: 0, x: 5, y: 5, status: "Rout" });
    const rout1 = makeUnit({ side: 1, x: 2, y: 5, status: "Rout" });
    const store = makeStoreWith([rout0, rout1]);

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
// selectCanPassNow: blocks passing while active side has Shaken unit in melee
// ---------------------------------------------------------------------------

describe("selectCanPassNow", () => {
  function makeMovePhaseStore(
    units: UnitEntity[],
    activeSideId: number = 0,
    canPass: boolean = true,
  ) {
    const sideEntities = [makeSide(0), makeSide(1)];
    const store = makeStore({
      units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
      sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sideEntities),
      battle: {
        activeUnitId: undefined,
        canPass,
        messages: [],
        phase: Phase.Move,
        sideOrder: [activeSideId as SideId],
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
      units: unitsAdapter.setAll(unitsAdapter.getInitialState(), [shaken, enemy]),
      sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sideEntities),
      battle: {
        activeUnitId: undefined,
        canPass: true,
        messages: [],
        phase: Phase.Melee, // not Move
        sideOrder: [0 as SideId],
        sideIndex: 0,
        turn: 1,
      },
    });
    expect(selectCanPassNow(store.getState())).toBe(true);
  });
});
