import { bfsAbsolute, bfsByTerrain } from "./bfs.js";
import type { Tint } from "./components/GridOverlay.js";
import type { TerrainId, UnitId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import { Phase } from "./killchain/rules.js";
import type { TerrainType } from "./killchain/types.js";
import { KillChainEngine } from "./KillChainEngine.js";
import type { TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";

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
        bfsAbsolute(
          xyId(activeUnit.x, activeUnit.y),
          Object.values(terrainEntities),
          15,
        ),
      ).map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        cost: node.cost,
        reason: rangeName(node.cost),
      }));

    case Phase.Move:
      return Array.from(
        bfsByTerrain(
          new KillChainEngine(terrainEntities, unitEntities),
          activeUnit.type.mounted
            ? invalidTerrainForMountedUnits
            : invalidTerrain,
          xyId(activeUnit.x, activeUnit.y),
          Object.values(terrainEntities),
          activeUnit.type.move - activeUnit.moved,
        ),
      ).map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        cost: node.cost,
        reason: "reachable",
      }));
  }

  return [];
}
