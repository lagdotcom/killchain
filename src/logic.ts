import type { Tint, TintReason } from "./components/GridOverlay.js";
import type { Cells, Feet, SideId, UnitId } from "./flavours.js";
import { type XY, xyId } from "./killchain/EuclideanEngine.js";
import {
  longRangeMax,
  mediumRangeMax,
  Phase,
  shortRangeMax,
} from "./killchain/rules.js";
import type {
  DeploymentZone,
  OptionalRules,
  TerrainType,
} from "./killchain/types.js";
import { KillChainEngine } from "./KillChainEngine.js";
import {
  type PathNode,
  searchAbsolute,
  searchByTerrain,
} from "./pathfinding.js";
import { isEnemy } from "./state/alliance.js";
import type { MapEntity } from "./state/maps.js";
import type { SideEntity } from "./state/sides.js";
import type { UnitEntity } from "./state/units.js";
import { manhattanDistance } from "./tools.js";

const rangeName = (cost: Feet) =>
  cost <= shortRangeMax ? "short" : cost <= mediumRangeMax ? "medium" : "long";

const invalidTerrainForMountedUnits = new Set<TerrainType>(["Marsh"]);
const invalidTerrain = new Set<TerrainType>();

const nodeToTint = (
  { id, x, y, cost }: PathNode,
  reason: TintReason,
): Tint => ({ id, x, y, cost, reason });

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
  sideEntities: Partial<Record<SideId, SideEntity>>,
  rules?: OptionalRules,
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

      const enemies = Object.values(unitEntities).filter(
        (u) =>
          isEnemy(activeUnit.side, u.side, sideEntities) &&
          u.status !== "Rout" &&
          !isNaN(u.x),
      );
      const adjacentEnemies = enemies.filter(
        (e) => manhattanDistance(activeUnit, e) === 1,
      );

      if (rules?.meleeEngagement) {
        // Cavalry charge: unit cannot move at all.
        if (adjacentEnemies.some((e) => e.type.mounted && e.moved > 0)) {
          return [];
        }
      }

      if (activeUnit.status === "Shaken" && enemies.length > 0) {
        const currentDistances = new Map(
          enemies.map((e) => [e.id, manhattanDistance(activeUnit, e)]),
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

      // Normal unit in melee: costly withdrawal — one cell only, full move consumed.
      if (rules?.meleeEngagement && adjacentEnemies.length > 0) {
        const remaining = activeUnit.type.move - activeUnit.moved;
        return reachable
          .filter((node) => manhattanDistance(node, activeUnit) === 1)
          .map((node) => nodeToTint({ ...node, cost: remaining }, "reachable"));
      }

      return reachable.map((node) => nodeToTint(node, "reachable"));
    }
  }

  return [];
}
