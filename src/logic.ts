import type { Tint } from "./components/GridOverlay.js";
import type { TerrainId, UnitId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import { Phase } from "./killchain/rules.js";
import type { TerrainType } from "./killchain/types.js";
import { KillChainEngine } from "./KillChainEngine.js";
import {
  searchAbsolute,
  searchByTerrain,
  squareAdjacency,
} from "./pathfinding.js";
import type { TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";
import { manhattanDistance } from "./tools.js";

const rangeName = (cost: number) =>
  cost <= 5 ? "short" : cost <= 10 ? "medium" : "long";

const invalidTerrainForMountedUnits = new Set<TerrainType>(["Marsh"]);
const invalidTerrain = new Set<TerrainType>();

export function getTints(
  activeUnit: UnitEntity | undefined,
  phase: Phase,
  terrainEntities: Record<TerrainId, TerrainEntity>,
  unitEntities: Record<UnitId, UnitEntity>,
): Tint[] {
  if (!activeUnit) return [];

  switch (phase) {
    case Phase.Missile:
      if (!activeUnit.missile) return [];
      return Array.from(
        searchAbsolute(
          squareAdjacency,
          xyId(activeUnit.x, activeUnit.y),
          Object.values(terrainEntities),
          15,
        ).values(),
      ).map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        cost: node.cost,
        reason: rangeName(node.cost),
      }));

    case Phase.Move: {
      const reachable = Array.from(
        searchByTerrain(
          new KillChainEngine(terrainEntities, unitEntities),
          activeUnit.type.mounted
            ? invalidTerrainForMountedUnits
            : invalidTerrain,
          squareAdjacency,
          xyId(activeUnit.x, activeUnit.y),
          Object.values(terrainEntities),
          activeUnit.type.move - activeUnit.moved,
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

          const satisfiesBoth = (node: { x: number; y: number }) =>
            enemies.every(
              (e) => manhattanDistance(node, e) >= currentDistances.get(e.id)!,
            ) && adjacentEnemies.every((e) => manhattanDistance(node, e) > 1);

          const satisfiesExitMelee = (node: { x: number; y: number }) =>
            adjacentEnemies.every((e) => manhattanDistance(node, e) > 1);

          const filtered = reachable.filter(satisfiesBoth);
          const fallback =
            adjacentEnemies.length > 0
              ? reachable.filter(satisfiesExitMelee)
              : reachable;

          const validNodes = filtered.length > 0 ? filtered : fallback;

          return validNodes.map((node) => ({
            id: node.id,
            x: node.x,
            y: node.y,
            cost: node.cost,
            reason: "reachable" as const,
          }));
        }
      }

      return reachable.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        cost: node.cost,
        reason: "reachable",
      }));
    }
  }

  return [];
}
