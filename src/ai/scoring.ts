import { type XY, xyId } from "../killchain/EuclideanEngine.js";
import { getAttackRollTarget } from "../killchain/rules.js";
import type { DeploymentZone } from "../killchain/types.js";
import { inZone, isAllyByMap } from "../killchain/victory.js";
import type { KillChainEngine } from "../KillChainEngine.js";
import type { MapEntity } from "../state/maps.js";
import type { UnitEntity } from "../state/units.js";
import { manhattanDistance } from "../tools.js";
import type { AiConfig, VpContext } from "./types.js";

export function scoreAttackTarget(
  attacker: UnitEntity,
  defender: UnitEntity,
  g: KillChainEngine,
  missile: boolean,
  focusFire = false,
  vpContext?: VpContext,
): number {
  const target = getAttackRollTarget(g, missile, attacker, defender);
  if (target > 6) return -Infinity;
  const killBonus = defender.damage + 1 >= defender.type.hits ? 100 : 0;
  const shakenBonus = defender.status === "Shaken" ? 10 : 0;
  const focusBonus = focusFire
    ? (defender.damage > 0 ? 5 : 0) + (defender.flankCount > 0 ? 3 : 0)
    : 0;
  const eliminateBonus =
    vpContext &&
    vpContext.conditions.some(
      (c) =>
        c.type === "unit_eliminated" &&
        c.unitId === defender.id &&
        isAllyByMap(c.sideId, vpContext.sideId, vpContext.allianceMap),
    )
      ? 50
      : 0;
  const unitsDestroyedBonus = vpContext
    ? vpContext.conditions
        .filter(
          (c) =>
            c.type === "units_destroyed" &&
            isAllyByMap(c.sideId, vpContext.sideId, vpContext.allianceMap),
        )
        .reduce((sum, c) => sum + c.points, 0)
    : 0;
  return (
    -target +
    killBonus +
    shakenBonus +
    focusBonus +
    eliminateBonus +
    unitsDestroyedBonus
  );
}

export function scoreMoveCell(
  cell: XY,
  enemies: UnitEntity[],
  config: AiConfig,
  unit: UnitEntity,
  map?: MapEntity,
  vpContext?: VpContext,
): number {
  if (enemies.length === 0 && (!vpContext || vpContext.conditions.length === 0))
    return 0;

  let score = 0;
  const urgency = vpContext?.turnLimit
    ? Math.min(vpContext.turn / vpContext.turnLimit, 1)
    : 0;

  let nearestDist = 0;
  if (enemies.length > 0) {
    const nearest = enemies.reduce((a, b) =>
      manhattanDistance(cell, a) < manhattanDistance(cell, b) ? a : b,
    );
    nearestDist = manhattanDistance(cell, nearest);
    score =
      config.holdBackIfDamaged && unit.damage > 0
        ? nearestDist
        : 0 - nearestDist;
  }

  if (map) {
    const terrain = map.cells.entities[xyId(cell.x, cell.y)];
    if (config.seekHighGround && terrain) score += terrain.elevation * 0.5;
    if (config.avoidDifficultTerrain && terrain) {
      if (terrain.type === "Woods" || terrain.type === "Marsh") score -= 2;
    }
  }

  if (vpContext) {
    // turns_survived: as the turn limit nears, prefer staying distant from enemies.
    const hasTurnsSurvived = vpContext.conditions.some(
      (c) =>
        c.type === "turns_survived" &&
        isAllyByMap(c.sideId, vpContext.sideId, vpContext.allianceMap),
    );
    if (hasTurnsSurvived && enemies.length > 0 && urgency > 0) {
      score += nearestDist * urgency * 2;
    }

    for (const cond of vpContext.conditions) {
      if (!isAllyByMap(cond.sideId, vpContext.sideId, vpContext.allianceMap))
        continue;
      if (
        (cond.type === "control_zone" || cond.type === "zone_held_turns") &&
        inZone(cond.zone, cell.x, cell.y)
      ) {
        // Zone bonus scales with urgency: more critical as the turn limit nears.
        score += 3 * (1 + urgency * 2);
      }
      if (cond.type === "zone_violated" && inZone(cond.zone, cell.x, cell.y)) {
        score += 3;
      }
    }
  }

  return score;
}

export function scorePlacementCell(
  cell: XY,
  _zone: DeploymentZone | undefined,
  unit: UnitEntity,
  existingPlacements: XY[],
  map: MapEntity,
  config?: AiConfig,
): number {
  // Cells closer to the map centre are the "front line".
  // Missile units prefer the rear (far from centre); melee prefer the front.
  const mapCenterY = (map.height - 1) / 2;
  const distToCenter = Math.abs(cell.y - mapCenterY);
  const rowScore = unit.missile ? distToCenter : 0 - distToCenter;

  // Spread units across columns to avoid stacking.
  const stackPenalty =
    existingPlacements.filter((p) => p.x === cell.x).length * 3;

  const cellTerrain = map.cells.entities[xyId(cell.x, cell.y)];

  // Config-driven terrain preferences mirror movement scoring.
  const elevationBonus =
    config?.seekHighGround && cellTerrain ? cellTerrain.elevation * 0.5 : 0;
  const terrainPenalty =
    cellTerrain &&
    (cellTerrain.type === "Woods" || cellTerrain.type === "Marsh")
      ? config?.avoidDifficultTerrain
        ? -3
        : unit.missile && cellTerrain.type === "Woods"
          ? -3
          : 0
      : 0;

  return rowScore - stackPenalty + elevationBonus + terrainPenalty;
}
