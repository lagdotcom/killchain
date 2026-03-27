import { describe, expect, test } from "vitest";

import type { Cells, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { KillChain, Terrain, Unit } from "./killchain/types.js";
import {
  type PathNode,
  searchAbsolute,
  searchByTerrain,
  squareAdjacency,
} from "./pathfinding.js";
import type { TerrainEntity } from "./state/terrain.js";

function makeGrid(
  width: number,
  height: number,
  overrides: Record<string, Partial<TerrainEntity>> = {},
): TerrainEntity[] {
  const terrain: TerrainEntity[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = xyId(x, y) as TerrainId;
      terrain.push({
        id,
        x: x as Cells,
        y: y as Cells,
        type: "Open",
        elevation: 0,
        ...overrides[id],
      });
    }
  }
  return terrain;
}

function nodeCosts(result: Map<string, PathNode>) {
  return Object.fromEntries(
    [...result.entries()].map(([id, n]) => [id, n.cost]),
  );
}

describe("searchAbsolute", () => {
  test("returns start node at cost 0", () => {
    const terrain = makeGrid(3, 3);
    const result = searchAbsolute(
      squareAdjacency,
      xyId(1, 1) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    expect(costs["1,1"]).toBe(0);
  });

  test("adjacent cells cost 1", () => {
    const terrain = makeGrid(3, 3);
    const result = searchAbsolute(
      squareAdjacency,
      xyId(1, 1) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    expect(costs["1,0"]).toBe(1);
    expect(costs["0,1"]).toBe(1);
    expect(costs["2,1"]).toBe(1);
    expect(costs["1,2"]).toBe(1);
  });

  test("diagonal cells cost 2 (manhattan)", () => {
    const terrain = makeGrid(3, 3);
    const result = searchAbsolute(
      squareAdjacency,
      xyId(1, 1) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(2);
    expect(costs["2,2"]).toBe(2);
  });

  test("respects maxCost limit", () => {
    const terrain = makeGrid(5, 1);
    const result = searchAbsolute(
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
      2,
    );
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBe(1);
    expect(costs["2,0"]).toBe(2);
    expect(costs["3,0"]).toBeUndefined();
    expect(costs["4,0"]).toBeUndefined();
  });

  test("explores all reachable cells in a grid", () => {
    const terrain = makeGrid(3, 3);
    const result = searchAbsolute(
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
    );

    expect(result.size).toBe(9);
  });
});

describe("searchByTerrain", () => {
  function makeEngine(
    terrain: TerrainEntity[],
    occupiedPositions: TerrainId[] = [],
  ): KillChain<TerrainId> {
    const terrainMap: Record<string, Terrain> = {};
    for (const t of terrain) terrainMap[t.id] = t;

    return {
      getDistance: () => 0,
      getPosition: () => "" as TerrainId,
      getTerrainAt: (p: TerrainId) =>
        terrainMap[p] ?? { type: "Open" as const, elevation: 0 },
      getTerrain: () => ({ type: "Open" as const, elevation: 0 }),
      getUnitAt: (p: TerrainId): Unit | undefined =>
        occupiedPositions.includes(p)
          ? ({ name: "blocker" } as Unit)
          : undefined,
    };
  }

  test("woods cells cost 2 to enter", () => {
    const terrain = makeGrid(3, 1, {
      "1,0": { type: "Woods" },
    });
    const g = makeEngine(terrain);
    const result = searchByTerrain(
      g,
      new Set(),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBe(2);
    expect(costs["2,0"]).toBe(3);
  });

  test("uphill cells cost 2 to enter", () => {
    const terrain = makeGrid(3, 1, {
      "1,0": { elevation: 1 },
    });
    const g = makeEngine(terrain);
    const result = searchByTerrain(
      g,
      new Set(),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    expect(costs["1,0"]).toBe(2);
  });

  test("occupied cells are unreachable", () => {
    const terrain = makeGrid(3, 1);
    const occupied = [xyId(1, 0) as TerrainId];
    const g = makeEngine(terrain, occupied);
    const result = searchByTerrain(
      g,
      new Set(),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
      10,
    );
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBeUndefined();
    expect(costs["2,0"]).toBeUndefined();
  });

  test("invalid terrain for mounted units is unreachable", () => {
    const terrain = makeGrid(3, 1, {
      "1,0": { type: "Marsh" },
    });
    const g = makeEngine(terrain);
    const result = searchByTerrain(
      g,
      new Set(["Marsh"]),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
      10,
    );
    const costs = nodeCosts(result);

    expect(costs["0,0"]).toBe(0);
    expect(costs["1,0"]).toBeUndefined();
    expect(costs["2,0"]).toBeUndefined();
  });

  test("maxCost limits reachable cells with terrain costs", () => {
    const terrain = makeGrid(4, 1, {
      "1,0": { type: "Woods" },
    });
    const g = makeEngine(terrain);
    const result = searchByTerrain(
      g,
      new Set(),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
      3,
    );
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
    const terrain = makeGrid(4, 2, {
      "1,0": { type: "Woods", elevation: 1 },
      "2,0": { type: "Woods", elevation: 2 },
    });
    const g = makeEngine(terrain);
    const result = searchByTerrain(
      g,
      new Set(),
      squareAdjacency,
      xyId(0, 0) as TerrainId,
      terrain,
    );
    const costs = nodeCosts(result);

    // Direct top path to (3,0): 3 + 3 + 1 = 7
    // Bottom detour: (0,0)→(0,1)[1]→(1,1)[2]→(2,1)[3]→(3,1)[4]→(3,0)[5]
    expect(costs["3,0"]).toBe(5);
  });
});
