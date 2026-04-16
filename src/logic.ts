import type { Tint, TintReason } from "./components/GridOverlay.js";
import type { Cells, Feet, UnitId } from "./flavours.js";
import { type XY, xyId } from "./killchain/EuclideanEngine.js";
import {
  longRangeMax,
  mediumRangeMax,
  Phase,
  shortRangeMax,
} from "./killchain/rules.js";
import type { DeploymentZone, TerrainType } from "./killchain/types.js";
import { KillChainEngine } from "./KillChainEngine.js";
import {
  type PathNode,
  searchAbsolute,
  searchByTerrain,
} from "./pathfinding.js";
import type { MapEntity } from "./state/maps.js";
import type { UnitEntity } from "./state/units.js";
import { manhattanDistance } from "./tools.js";

const rangeName = (cost: Feet) =>
  cost <= shortRangeMax ? "short" : cost <= mediumRangeMax ? "medium" : "long";

const invalidTerrainForMountedUnits = new Set<TerrainType>(["Marsh"]);
const invalidTerrain = new Set<TerrainType>();

const nodeToTint = (
  { id, x, y, cost }: PathNode,
  reason: TintReason,
): Tint => ({
  id,
  x,
  y,
  cost,
  reason,
});

export function isInDeploymentZone(
  zone: DeploymentZone,
  x: Cells,
  y: Cells,
): boolean {
  return (
    x >= zone.x &&
    x < zone.x + zone.width &&
    y >= zone.y &&
    y < zone.y + zone.height
  );
}


export function getTints(
  activeUnit: UnitEntity | undefined,
  phase: Phase,
  map: MapEntity,
  unitEntities: Record<UnitId, UnitEntity>,
): Tint[] {
  if (!activeUnit) return [];

  switch (phase) {
    case Phase.Missile:
      if (!activeUnit.missile) return [];
      return Array.from(
        searchAbsolute(
          map,
          xyId(activeUnit.x, activeUnit.y),
          longRangeMax,
        ).values(),
      ).map((node) => nodeToTint(node, rangeName(node.cost)));

    case Phase.Move: {
      const flying = !!activeUnit.type.flying;
      const reachable = Array.from(
        searchByTerrain(
          new KillChainEngine(map, unitEntities),
          map,
          activeUnit.type.mounted && !flying
            ? invalidTerrainForMountedUnits
            : invalidTerrain,
          xyId(activeUnit.x, activeUnit.y),
          activeUnit.type.move - activeUnit.moved,
          flying,
        ).values(),
      );

      if (activeUnit.status === "Shaken") {
        const enemies = Object.values(unitEntities).filter(
          (u) =>
            u.side !== activeUnit.side && u.status !== "Rout" && !isNaN(u.x),
        );

        if (enemies.length > 0) {
          const currentDistances = new Map(
            enemies.map((e) => [e.id, manhattanDistance(activeUnit, e)]),
          );
          const adjacentEnemies = enemies.filter(
            (e) => currentDistances.get(e.id) === 1,
          );

          const satisfiesBoth = (node: XY) =>
            enemies.every(
              (e) => manhattanDistance(node, e) >= currentDistances.get(e.id)!,
            ) && adjacentEnemies.every((e) => manhattanDistance(node, e) > 1);

          const satisfiesExitMelee = (node: XY) =>
            adjacentEnemies.every((e) => manhattanDistance(node, e) > 1);

          const filtered = reachable.filter(satisfiesBoth);
          const fallback =
            adjacentEnemies.length > 0
              ? reachable.filter(satisfiesExitMelee)
              : reachable;

          const validNodes = filtered.length > 0 ? filtered : fallback;

          return validNodes.map((node) => nodeToTint(node, "reachable"));
        }
      }

      return reachable.map((node) => nodeToTint(node, "reachable"));
    }
  }

  return [];
}
