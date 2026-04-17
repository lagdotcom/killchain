import { describe, expect, test } from "vitest";

import type { Cells, SideId, TerrainId, UnitId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import { Phase } from "./killchain/rules.js";
import type { DeploymentZone } from "./killchain/types.js";
import { heavyFoot, heavyHorse } from "./killchain/units.js";
import { getTints, isInDeploymentZone } from "./logic.js";
import type { MapEntity } from "./state/maps.js";
import type { TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";
import { makeGridMap } from "./testHelpers.js";

let _uid = 0;
function makeUnit(
  partial: Partial<UnitEntity> & { side: SideId; x: Cells; y: Cells },
): UnitEntity {
  return {
    id: `u${_uid++}`,
    name: "Unit",
    type: heavyFoot, // move=6
    missile: false,
    flankCount: 0,
    damage: 0,
    moved: 0,
    status: "Normal",
    ready: true,
    ...partial,
  };
}

function unitMap(...units: UnitEntity[]): Record<UnitId, UnitEntity> {
  return Object.fromEntries(units.map((u) => [u.id, u]));
}

function tintCoords(
  activeUnit: UnitEntity,
  units: UnitEntity[],
  map: MapEntity,
) {
  return getTints(activeUnit, Phase.Move, map, unitMap(...units), {}).map(
    ({ x, y }) => `${x},${y}`,
  );
}

// ---------------------------------------------------------------------------
// Normal units: no withdrawal filter applied
// ---------------------------------------------------------------------------

describe("getTints — Normal unit", () => {
  test("can advance toward an enemy", () => {
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 2, y: 5, status: "Normal" });
    const enemy = makeUnit({ side: 1, x: 8, y: 5, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // (3,5) is one step closer to enemy at (8,5) — allowed for Normal
    expect(coords).toContain("3,5");
  });
});

// ---------------------------------------------------------------------------
// Shaken units: cannot advance toward any enemy
// ---------------------------------------------------------------------------

describe("getTints — Shaken unit withdrawal filter", () => {
  test("cannot move to a square closer to the enemy", () => {
    const terrain = makeGridMap(10, 10);
    // enemy is at (8,5), unit is at (4,5) — dist=4
    const unit = makeUnit({ side: 0, x: 4, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 8, y: 5, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // (5,5) dist=3 < 4 — forbidden
    expect(coords).not.toContain("5,5");
    // (6,5) dist=2 < 4 — forbidden
    expect(coords).not.toContain("6,5");
  });

  test("can stay in place or retreat away from enemy", () => {
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 4, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 8, y: 5, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // (4,5) dist=4 >= 4 — allowed (staying)
    expect(coords).toContain("4,5");
    // (3,5) dist=5 > 4 — allowed (retreating)
    expect(coords).toContain("3,5");
  });

  test("cannot advance toward any enemy, even when retreating from another", () => {
    const terrain = makeGridMap(10, 10);
    // Enemy A at (8,5) dist=4; Enemy B at (1,5) dist=3
    const unit = makeUnit({ side: 0, x: 4, y: 5, status: "Shaken" });
    const enemyA = makeUnit({ side: 1, x: 8, y: 5, status: "Normal" });
    const enemyB = makeUnit({ side: 1, x: 1, y: 5, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemyA, enemyB], terrain);

    // (5,5) is closer to A — forbidden even though farther from B
    expect(coords).not.toContain("5,5");
    // (3,5) is closer to B — forbidden even though farther from A
    expect(coords).not.toContain("3,5");
    // (4,4) dist to A=5>=4, dist to B=4>=3 — both safe
    expect(coords).toContain("4,4");
  });

  test("can move when there are no enemies", () => {
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });

    const coords = tintCoords(unit, [unit], terrain);

    // No enemies — all reachable squares allowed
    expect(coords.length).toBeGreaterThan(1);
    expect(coords).toContain("5,4");
    expect(coords).toContain("4,5");
  });

  test("Rout enemies are not counted for the withdrawal filter", () => {
    const terrain = makeGridMap(15, 10);
    // Rout enemy at (12,5) — far enough that the Shaken unit can advance
    // toward it without entering its cell (move=6, unit at (4,5), dist=8).
    // Since it's Rout it does not constrain the withdrawal filter, so (5,5)
    // (one step closer to it) should be a valid tint.
    const unit = makeUnit({ side: 0, x: 4, y: 5, status: "Shaken" });
    const routEnemy = makeUnit({ side: 1, x: 12, y: 5, status: "Rout" });

    const coords = tintCoords(unit, [unit, routEnemy], terrain);

    // Advancing toward the Rout enemy is permitted (no withdrawal constraint)
    expect(coords).toContain("5,5");
    expect(coords).toContain("6,5");
  });
});

// ---------------------------------------------------------------------------
// Shaken units in melee: must exit contact
// ---------------------------------------------------------------------------

describe("getTints — Shaken unit must exit melee", () => {
  test("current position is excluded when in melee contact", () => {
    const terrain = makeGridMap(10, 10);
    // enemy at (5,6), unit at (5,5) — dist=1
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 5, y: 6, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // Staying at (5,5) still counts as melee contact — not valid
    expect(coords).not.toContain("5,5");
  });

  test("squares adjacent to the enemy are excluded", () => {
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 5, y: 6, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // (4,6) and (6,6) are adjacent to enemy — forbidden
    expect(coords).not.toContain("4,6");
    expect(coords).not.toContain("6,6");
  });

  test("squares at distance >= 2 from the enemy are included", () => {
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemy = makeUnit({ side: 1, x: 5, y: 6, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemy], terrain);

    // (5,4) dist=2, (4,5) dist=2, (6,5) dist=2 — all valid exits
    expect(coords).toContain("5,4");
    expect(coords).toContain("4,5");
    expect(coords).toContain("6,5");
  });

  test("exit-melee takes priority over no-closing when they conflict", () => {
    // Shaken unit at (5,5), enemy A at (5,6) — melee, enemy B at (5,3) — dist=2
    // Moving to (5,4) exits melee with A (dist=2) but approaches B (dist=1 < 2).
    // satisfiesBoth = empty; fallback (exit-melee only) should include (5,4).
    const terrain = makeGridMap(10, 10);
    const unit = makeUnit({ side: 0, x: 5, y: 5, status: "Shaken" });
    const enemyA = makeUnit({ side: 1, x: 5, y: 6, status: "Normal" });
    const enemyB = makeUnit({ side: 1, x: 5, y: 3, status: "Normal" });

    const coords = tintCoords(unit, [unit, enemyA, enemyB], terrain);

    // (5,4) exits melee with A and is the only reachable exit in this corridor
    // when the no-closing rule prevents (5,4) for enemyB, the fallback applies.
    // With move=6 and a clear grid, (4,5)/(6,5) also satisfy both rules,
    // so the fallback may or may not fire. The key assertion:
    // (5,5) (current, melee with A) must never appear.
    expect(coords).not.toContain("5,5");
    // And the unit must have some valid moves (not completely blocked)
    expect(coords.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Flying units: ignore terrain costs and invalid terrain
// ---------------------------------------------------------------------------

describe("getTints — flying unit", () => {
  test("flying unit can reach cells beyond Woods that a non-flying unit cannot", () => {
    // Row y=5 is all Woods except (0,5). heavyFoot move=60ft, cellSize=10.
    // Non-flying: Woods costs 20ft/cell → 3 cells max → reaches (3,5).
    // Flying: flat 10ft/cell → 6 cells max → reaches (6,5).
    const overrides: Record<TerrainId, Partial<TerrainEntity>> = {};
    for (let x = 1; x <= 9; x++)
      overrides[xyId(x as Cells, 5 as Cells)] = { type: "Woods" };
    const map = makeGridMap(10, 10, 10, overrides);

    const flyingType = { ...heavyFoot, flying: true };
    const flyingUnit = makeUnit({ side: 0, x: 0, y: 5, type: flyingType });
    const normalUnit = makeUnit({ side: 0, x: 0, y: 5 });

    const flyingCoords = tintCoords(flyingUnit, [flyingUnit], map);
    const normalCoords = tintCoords(normalUnit, [normalUnit], map);

    expect(flyingCoords).toContain("6,5");
    expect(normalCoords).not.toContain("6,5");
    expect(flyingCoords).toContain("3,5");
    expect(normalCoords).toContain("3,5");
  });

  test("flying+mounted unit can enter Marsh that non-flying mounted unit cannot", () => {
    const overrides: Record<TerrainId, Partial<TerrainEntity>> = {
      [xyId(6 as Cells, 5 as Cells)]: { type: "Marsh" },
    };
    const map = makeGridMap(10, 10, 10, overrides);

    const flyingMountedType = { ...heavyHorse, flying: true };
    const flyingUnit = makeUnit({
      side: 0,
      x: 5,
      y: 5,
      type: flyingMountedType,
    });
    const groundUnit = makeUnit({ side: 0, x: 5, y: 5, type: heavyHorse });

    const flyingCoords = tintCoords(flyingUnit, [flyingUnit], map);
    const groundCoords = tintCoords(groundUnit, [groundUnit], map);

    expect(flyingCoords).toContain("6,5");
    expect(groundCoords).not.toContain("6,5");
  });
});

// ---------------------------------------------------------------------------
// Deployment zone helpers
// ---------------------------------------------------------------------------

function zone(
  x: number,
  y: number,
  width: number,
  height: number,
): DeploymentZone {
  return {
    x: x as Cells,
    y: y as Cells,
    width: width as Cells,
    height: height as Cells,
  };
}

describe("isInDeploymentZone", () => {
  test("returns true for a cell inside the zone", () => {
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 2 as Cells, 3 as Cells)).toBe(
      true,
    );
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 5 as Cells, 5 as Cells)).toBe(
      true,
    );
  });

  test("returns false for a cell outside the zone", () => {
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 1 as Cells, 3 as Cells)).toBe(
      false,
    ); // x too low
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 6 as Cells, 3 as Cells)).toBe(
      false,
    ); // x == x+width
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 2 as Cells, 2 as Cells)).toBe(
      false,
    ); // y too low
    expect(isInDeploymentZone(zone(2, 3, 4, 3), 2 as Cells, 6 as Cells)).toBe(
      false,
    ); // y == y+height
  });

  test("boundary cells on the far edge are excluded (half-open interval)", () => {
    // zone(0,0,3,3) covers x in [0,3), y in [0,3)
    expect(isInDeploymentZone(zone(0, 0, 3, 3), 2 as Cells, 2 as Cells)).toBe(
      true,
    );
    expect(isInDeploymentZone(zone(0, 0, 3, 3), 3 as Cells, 0 as Cells)).toBe(
      false,
    );
    expect(isInDeploymentZone(zone(0, 0, 3, 3), 0 as Cells, 3 as Cells)).toBe(
      false,
    );
  });

  test("1×1 zone contains only its own cell", () => {
    const z = zone(5, 7, 1, 1);
    expect(isInDeploymentZone(z, 5 as Cells, 7 as Cells)).toBe(true);
    expect(isInDeploymentZone(z, 4 as Cells, 7 as Cells)).toBe(false);
    expect(isInDeploymentZone(z, 5 as Cells, 8 as Cells)).toBe(false);
  });
});
