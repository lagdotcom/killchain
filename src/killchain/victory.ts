import type { SideId, UnitId, VictoryPoints } from "../flavours.js";
import type { BattleEvent } from "../state/battle.js";
import type { VictoryCondition, VictoryZone } from "../state/scenarios.js";
import type { SideEntity } from "../state/sides.js";
import type { UnitEntity } from "../state/units.js";

export function inZone(zone: VictoryZone, x: number, y: number): boolean {
  return (
    x >= zone.x &&
    x < zone.x + zone.width &&
    y >= zone.y &&
    y < zone.y + zone.height
  );
}

export function isAllyByMap(
  sideA: SideId,
  sideB: SideId,
  allianceMap: Partial<Record<SideId, number>>,
): boolean {
  if (sideA === sideB) return true;
  const a = allianceMap[sideA];
  const b = allianceMap[sideB];
  if (a === undefined || b === undefined) return false;
  return a === b;
}

export function isEnemyByMap(
  sideA: SideId,
  sideB: SideId,
  allianceMap: Partial<Record<SideId, number>>,
): boolean {
  return !isAllyByMap(sideA, sideB, allianceMap);
}

export function computeVP(
  conditions: VictoryCondition[],
  units: UnitEntity[],
  sides: SideEntity[],
  allianceMap: Partial<Record<SideId, number>>,
  battleLog: BattleEvent[],
  exitedUnitIds: UnitId[],
  accumulatedZoneVP: Partial<Record<SideId, VictoryPoints>>,
): Partial<Record<SideId, VictoryPoints>> {
  const vp: Partial<Record<SideId, VictoryPoints>> = {};

  function add(sideId: SideId, points: VictoryPoints) {
    vp[sideId] = ((vp[sideId] ?? 0) + points) as VictoryPoints;
  }

  // Include already-accumulated zone_held_turns VP first.
  for (const [key, pts] of Object.entries(accumulatedZoneVP)) {
    if (pts !== undefined && pts !== 0) add(Number(key) as SideId, pts);
  }

  const exitedSet = new Set<UnitId>(exitedUnitIds);

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i]!;

    switch (cond.type) {
      case "surviving_units": {
        const count = units.filter(
          (u) => u.side === cond.sideId && u.status !== "Rout",
        ).length;
        if (count > 0) add(cond.sideId, (count * cond.points) as VictoryPoints);
        break;
      }

      case "units_destroyed": {
        const count = battleLog.filter(
          (e) =>
            (e.type === "unit_destroyed" &&
              isAllyByMap(e.bySideId, cond.sideId, allianceMap) &&
              isEnemyByMap(e.sideId, cond.sideId, allianceMap)) ||
            (e.type === "unit_fled" &&
              isEnemyByMap(e.sideId, cond.sideId, allianceMap)),
        ).length;
        if (count > 0) add(cond.sideId, (count * cond.points) as VictoryPoints);
        break;
      }

      case "enemy_routed": {
        const hasLivingEnemy = units.some(
          (u) =>
            isEnemyByMap(u.side, cond.sideId, allianceMap) &&
            u.status !== "Rout",
        );
        if (!hasLivingEnemy) add(cond.sideId, cond.points);
        break;
      }

      case "unit_eliminated": {
        const u = units.find((u) => u.id === cond.unitId);
        if (!u || u.status === "Rout" || exitedSet.has(cond.unitId))
          add(cond.sideId, cond.points);
        break;
      }

      case "unit_survives": {
        const u = units.find((u) => u.id === cond.unitId);
        if (u && u.status !== "Rout") add(cond.sideId, cond.points);
        break;
      }

      case "exit_unit": {
        if (exitedSet.has(cond.unitId)) add(cond.sideId, cond.points);
        break;
      }

      case "control_zone": {
        const ownInZone = units.some(
          (u) =>
            u.side === cond.sideId &&
            u.status !== "Rout" &&
            !isNaN(u.x) &&
            inZone(cond.zone, u.x, u.y),
        );
        const enemyInZone = units.some(
          (u) =>
            isEnemyByMap(u.side, cond.sideId, allianceMap) &&
            u.status !== "Rout" &&
            !isNaN(u.x) &&
            inZone(cond.zone, u.x, u.y),
        );
        if (ownInZone && !enemyInZone) add(cond.sideId, cond.points);
        break;
      }

      case "zone_violated": {
        const triggered = battleLog.some(
          (e) => e.type === "zone_entered" && e.zoneIndex === i,
        );
        if (triggered) add(cond.sideId, cond.points);
        break;
      }

      case "zone_held_turns":
        // Already included via accumulatedZoneVP above.
        break;

      case "turns_survived": {
        const hasSurvivor = units.some(
          (u) => u.side === cond.sideId && u.status !== "Rout",
        );
        if (hasSurvivor) add(cond.sideId, cond.points);
        break;
      }
    }
  }

  // Suppress unused sides parameter — retained for future use (e.g. lookup).
  void sides;

  return vp;
}

/** Return the SideId with the highest VP total, or null on a tie. */
export function findVPWinner(
  vp: Partial<Record<SideId, VictoryPoints>>,
  sides: SideEntity[],
): SideEntity | null {
  let best: SideEntity | null = null;
  let bestVP = -Infinity;
  let tie = false;

  for (const side of sides) {
    const pts = vp[side.id] ?? 0;
    if (pts > bestVP) {
      bestVP = pts;
      best = side;
      tie = false;
    } else if (pts === bestVP) {
      tie = true;
    }
  }

  return tie ? null : best;
}
