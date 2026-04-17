import type { XY } from "../killchain/EuclideanEngine.js";
import { getAttackRollTarget } from "../killchain/rules.js";
import type { DeploymentZone } from "../killchain/types.js";
import type { KillChainEngine } from "../KillChainEngine.js";
import type { MapEntity } from "../state/maps.js";
import type { UnitEntity } from "../state/units.js";
import { manhattanDistance } from "../tools.js";
import type { AiConfig } from "./types.js";

export function scoreAttackTarget(
  attacker: UnitEntity,
  defender: UnitEntity,
  g: KillChainEngine,
  missile: boolean,
): number {
  const target = getAttackRollTarget(g, missile, attacker, defender);
  if (target > 6) return -Infinity;
  const killBonus = defender.damage + 1 >= defender.type.hits ? 100 : 0;
  const shakenBonus = defender.status === "Shaken" ? 10 : 0;
  return -target + killBonus + shakenBonus;
}

export function scoreMoveCell(
  cell: XY,
  enemies: UnitEntity[],
  config: AiConfig,
  unit: UnitEntity,
): number {
  if (enemies.length === 0) return 0;
  const nearest = enemies.reduce((a, b) =>
    manhattanDistance(cell, a) < manhattanDistance(cell, b) ? a : b,
  );
  const dist = manhattanDistance(cell, nearest);
  if (config.holdBackIfDamaged && unit.damage > 0) return dist;
  return -dist;
}

export function scorePlacementCell(
  cell: XY,
  _zone: DeploymentZone | undefined,
  unit: UnitEntity,
  existingPlacements: XY[],
  map: MapEntity,
): number {
  // Cells closer to the map centre are the "front line".
  // Missile units prefer the rear (far from centre); melee prefer the front.
  const mapCenterY = (map.height - 1) / 2;
  const distToCenter = Math.abs(cell.y - mapCenterY);
  const rowScore = unit.missile ? distToCenter : -distToCenter;

  // Spread units across columns to avoid stacking.
  const stackPenalty =
    existingPlacements.filter((p) => p.x === cell.x).length * 3;

  return rowScore - stackPenalty;
}
