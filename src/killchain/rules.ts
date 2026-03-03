import type { Armour, KillChain, Unit } from "./types.js";

const targetByArmourType: Record<Armour, number> = {
  Unarmoured: 3,
  Light: 4,
  Medium: 5,
  Heavy: 6,
};

export function getAttackModifiers<P>(
  g: KillChain<P>,
  missile: boolean,
  attacker: Unit,
  defender: Unit,
) {
  const distance = missile ? g.getDistance(attacker, defender) : 0;

  const mine = g.getTerrain(attacker);
  const theirs = g.getTerrain(defender);

  return {
    armour: targetByArmourType[defender.type.armour],
    rangePenalty:
      distance > 15 ? Infinity : distance > 10 ? 2 : distance > 5 ? 1 : 0,
    hillBonus: mine.elevation > theirs.elevation ? 1 : 0,
    woodsPenalty:
      missile && (mine.type === "Woods" || theirs.type === "Woods") ? 1 : 0,
  };
}

export function getAttackRollTarget<P>(
  g: KillChain<P>,
  missile: boolean,
  attacker: Unit,
  defender: Unit,
) {
  const { armour, rangePenalty, hillBonus, woodsPenalty } = getAttackModifiers(
    g,
    missile,
    attacker,
    defender,
  );

  return armour + rangePenalty + woodsPenalty - hillBonus;
}

export function getMovementCost<P>(g: KillChain<P>, from: P, to: P) {
  const location = g.getTerrainAt(from);
  const destination = g.getTerrainAt(to);

  let cost = 1;
  if (destination.elevation > location.elevation) cost += 1;
  if (destination.type === "Woods" || destination.type === "Marsh") cost += 1;

  return cost;
}
