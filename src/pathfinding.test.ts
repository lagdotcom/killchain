import { describe, expect, test } from "vitest";

import type { TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { KillChain, Unit } from "./killchain/types.js";
import {
  type PathNode,
  searchAbsolute,
  searchByTerrain,
} from "./pathfinding.js";
import type { MapEntity } from "./state/maps.js";
import { makeGridMap } from "./testHelpers.js";

function nodeCosts(result: Map<string, PathNode>) {
  return Object.fromEntries(
    [...result.entries()].map(([id, n]) => [id, n.cost]),
  );
}

describe("searchAbsolute", () => {
  test("returns start node at cost 0", () => {
    const map = makeGridMap(3, 3);
    const result = searchAbsolute(map, xyId(1, 1));
    const costs = nodeCosts(result);

    expect(costs["1,1"]).toBe(0);
  });

  test("adjacent cells cost 1", () => {
    const map = makeGridMap(3, 3, 1);
    const result = searchAbsolute(map, xyId(1, 1));
    const costs = nodeCosts(result);

    expect(costs["1,0"]).toBe(1);
    expect(costs["0,1"]).toBe(1);
    expect(costs["2,1"]).toBe(1);
    expect(costs["1,2"]).toBe(1);
  });

  test("diagonal cells cost 2 (manhattan)", () => {
    const map = makeGridMap(3, 3, 1);
    const result = searchAbsolute(map, xyId(1, 1));
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(2);
    expect(costs["2,2"]).toBe(2);
  });

  test("respects maxCost limit", () => {
    const map = makeGridMap(5, 1, 1);
    const result = searchAbsolute(map, xyId(0, 0), 2);
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBe(1);
    expect(costs["2,0"]).toBe(2);
    expect(costs["3,0"]).toBeUndefined();
    expect(costs["4,0"]).toBeUndefined();
  });

  test("explores all reachable cells in a grid", () => {
    const map = makeGridMap(3, 3);
    const result = searchAbsolute(map, xyId(0, 0));

    expect(result.size).toBe(9);
  });
});

describe("searchByTerrain", () => {
  function makeEngine(
    map: MapEntity,
    occupiedPositions: TerrainId[] = [],
  ): KillChain<TerrainId> {
    return {
      cellSize: map.cellSize,
      getDistance: () => 0,
      getPosition: () => "",
      getTerrainAt: (p: TerrainId) =>
        map.cells.entities[p] ?? { type: "Open", elevation: 0 },
      getTerrain: () => ({ type: "Open", elevation: 0 }),
      getUnitAt: (p: TerrainId): Unit | undefined =>
        occupiedPositions.includes(p)
          ? ({ name: "blocker" } as Unit)
          : undefined,
    };
  }

  test("woods cells cost 2 to enter", () => {
    const map = makeGridMap(3, 1, 1, {
      "1,0": { type: "Woods" },
    });
    const g = makeEngine(map);
    const result = searchByTerrain(g, map, new Set(), xyId(0, 0));
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBe(2);
    expect(costs["2,0"]).toBe(3);
  });

  test("uphill cells cost 2 to enter", () => {
    const map = makeGridMap(3, 1, 1, {
      "1,0": { elevation: 1 },
    });
    const g = makeEngine(map);
    const result = searchByTerrain(g, map, new Set(), xyId(0, 0));
    const costs = nodeCosts(result);

    expect(costs["1,0"]).toBe(2);
  });

  test("occupied cells are unreachable", () => {
    const map = makeGridMap(3, 1);
    const occupied = [xyId(1, 0)];
    const g = makeEngine(map, occupied);
    const result = searchByTerrain(g, map, new Set(), xyId(0, 0), 10);
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBeUndefined();
    expect(costs["2,0"]).toBeUndefined();
  });

  test("invalid terrain for mounted units is unreachable", () => {
    const map = makeGridMap(3, 1, 1, {
      "1,0": { type: "Marsh" },
    });
    const g = makeEngine(map);
    const result = searchByTerrain(g, map, new Set(["Marsh"]), xyId(0, 0), 10);
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBeUndefined();
    expect(costs["2,0"]).toBeUndefined();
  });

  test("maxCost limits reachable cells with terrain costs", () => {
    const map = makeGridMap(4, 1, 1, {
      "1,0": { type: "Woods" },
    });
    const g = makeEngine(map);
    const result = searchByTerrain(g, map, new Set(), xyId(0, 0), 3);
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBe(2);
    expect(costs["2,0"]).toBe(3);
    expect(costs["3,0"]).toBeUndefined();
  });

  test("finds cheaper path around expensive terrain", () => {
    // Regression: old FIFO BFS could assign wrong costs when
    // a cheaper detour exists around consecutive expensive cells.
    //
    // (0,0) → (1,0) → (2,0) → (3,0)
    //   |       |       |       |
    // (0,1) → (1,1) → (2,1) → (3,1)
    //
    // (1,0) and (2,0) are Woods+uphill (cost 3 to enter from row 0)
    const map = makeGridMap(4, 2, 1, {
      "1,0": { type: "Woods", elevation: 1 },
      "2,0": { type: "Woods", elevation: 2 },
    });
    const g = makeEngine(map);
    const result = searchByTerrain(g, map, new Set(), xyId(0, 0));
    const costs = nodeCosts(result);

    // Direct top path to (3,0): 3 + 3 + 1 = 7
    // Bottom detour: (0,0)→(0,1)[1]→(1,1)[2]→(2,1)[3]→(3,1)[4]→(3,0)[5]
    expect(costs["3,0"]).toBe(5);
  });
});
