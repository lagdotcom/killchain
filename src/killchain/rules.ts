import type { Feet } from "../flavours.js";
import type { Armour, KillChain, Unit } from "./types.js";

const targetByArmourType: Record<Armour, number> = {
  Unarmoured: 3,
  Light: 4,
  Medium: 5,
  Heavy: 6,
};

export const longRangeMax: Feet = 150;
export const longRangePenalty = 2;

export const mediumRangeMax: Feet = 100;
export const mediumRangePenalty = 1;

export const shortRangeMax: Feet = 50;
export const shortRangePenalty = 0;

export function getAttackModifiers<P>(
  g: KillChain<P>,
  missile: boolean,
  attacker: Unit,
  defender: Unit,
) {
  const distance: Feet = missile ? g.getDistance(attacker, defender) : 0;

  const mine = g.getTerrain(attacker);
  const theirs = g.getTerrain(defender);

  return {
    armour: targetByArmourType[defender.type.armour],
    rangePenalty:
      distance > longRangeMax
        ? Infinity
        : distance > mediumRangeMax
          ? longRangePenalty
          : distance > shortRangeMax
            ? mediumRangePenalty
            : shortRangePenalty,
    hillBonus: mine.elevation > theirs.elevation ? 1 : 0,
    woodsPenalty:
      missile && (mine.type === "Woods" || theirs.type === "Woods") ? 1 : 0,

    archerPenalty: !missile && !!attacker.missile ? 1 : 0,
    chargeBonus: attacker.type.mounted && attacker.moved && !missile ? 1 : 0,
    flankingBonus: !missile && defender.flankCount > 0 ? 1 : 0,
  };
}

export type AttackModifiers = ReturnType<typeof getAttackModifiers>;

export function applyAttackModifiers(mods: AttackModifiers) {
  const bonuses = mods.chargeBonus + mods.flankingBonus + mods.hillBonus;
  const penalties = mods.rangePenalty + mods.woodsPenalty + mods.archerPenalty;

  return mods.armour + penalties - bonuses;
}

export function getAttackRollTarget<P>(
  g: KillChain<P>,
  missile: boolean,
  attacker: Unit,
  defender: Unit,
) {
  return applyAttackModifiers(
    getAttackModifiers(g, missile, attacker, defender),
  );
}

export function getMovementCost<P>(g: KillChain<P>, from: P, to: P): Feet {
  const location = g.getTerrainAt(from);
  const destination = g.getTerrainAt(to);

  let cost = 1;
  if (destination.elevation > location.elevation) cost += 1;
  if (destination.type === "Woods" || destination.type === "Marsh") cost += 1;

  return cost * g.cellSize;
}

export enum Phase {
  Placement,
  Surprise,
  Initiative,
  Missile,
  Move,
  Melee,
  Morale,
  Completed,
}

export interface PassData {
  oldPhase: Phase;
  phase: Phase;
  turn: number;
}

export const phaseChanges: Record<
  Phase,
  { phase: Phase; nextTurn?: boolean; useSides?: boolean }
> = {
  [Phase.Placement]: { phase: Phase.Surprise },
  [Phase.Surprise]: { phase: Phase.Initiative, nextTurn: true },
  [Phase.Initiative]: { phase: Phase.Missile, useSides: true },
  [Phase.Missile]: { phase: Phase.Move, useSides: true },
  [Phase.Move]: { phase: Phase.Melee, useSides: true },
  [Phase.Melee]: { phase: Phase.Morale },
  [Phase.Morale]: { phase: Phase.Initiative, nextTurn: true },
  [Phase.Completed]: { phase: Phase.Completed },
};
