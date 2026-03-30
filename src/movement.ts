import type { Feet, UnitId } from "./flavours.js";
import { type XY, xyId } from "./killchain/EuclideanEngine.js";
import type { TerrainType } from "./killchain/types.js";
import { KillChainEngine } from "./KillChainEngine.js";
import { searchByTerrain } from "./pathfinding.js";
import type { MapEntity } from "./state/maps.js";
import type { UnitEntity } from "./state/units.js";

export interface MoveCandidate extends XY {
  cost: number;
}

const invalidTerrainForMounted = new Set<TerrainType>(["Marsh"]);
const noInvalidTerrain = new Set<TerrainType>();

/**
 * Returns true if the unit can reach a map edge cell with at least 1 movement
 * point remaining, meaning it can step off the board.
 *
 * Pass a unitEntities map that already excludes any units that should not
 * block the path (e.g. other routing units).
 */
export function canFleeBoard(
  unit: UnitEntity,
  unitEntities: Record<UnitId, UnitEntity>,
  map: MapEntity,
): boolean {
  const g = new KillChainEngine(map, unitEntities);
  const invalidTerrain = unit.type.mounted
    ? invalidTerrainForMounted
    : noInvalidTerrain;
  const budget: Feet = unit.type.move - unit.moved;

  const reachable = searchByTerrain(
    g,
    map,
    invalidTerrain,
    xyId(unit.x, unit.y),
    budget,
  );

  for (const node of reachable.values()) {
    if (
      node.x === 0 ||
      node.x === map.width - 1 ||
      node.y === 0 ||
      node.y === map.height - 1
    ) {
      if (node.cost < budget) return true;
    }
  }
  return false;
}

/**
 * Find the reachable cell that maximises score(cell) for the given unit,
 * respecting terrain movement costs and unit occupancy.
 * The unit's starting cell (cost 0) is excluded; returns undefined if the
 * unit has nowhere to move.
 *
 * Designed for reuse by any automated movement:
 *   - Flee from nearest enemy:  score = node => manhattanDistance(node, enemy)
 *   - Advance toward target:    score = node => -manhattanDistance(node, target)
 *   - Reach nearest board edge: score = node => -(min distance to any edge)
 */
export function findBestMove(
  unit: UnitEntity,
  unitEntities: Record<UnitId, UnitEntity>,
  map: MapEntity,
  score: (candidate: XY) => number,
): MoveCandidate | undefined {
  const g = new KillChainEngine(map, unitEntities);
  const invalidTerrain = unit.type.mounted
    ? invalidTerrainForMounted
    : noInvalidTerrain;

  const reachable = searchByTerrain(
    g,
    map,
    invalidTerrain,
    xyId(unit.x, unit.y),
    unit.type.move - unit.moved,
  );

  let best: MoveCandidate | undefined;
  let bestScore = -Infinity;

  for (const node of reachable.values()) {
    if (node.cost === 0) continue; // skip starting position
    const s = score(node);
    if (s > bestScore) {
      bestScore = s;
      best = { x: node.x, y: node.y, cost: node.cost };
    }
  }

  return best;
}
