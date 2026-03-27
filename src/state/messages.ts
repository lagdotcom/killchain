import { type AttackModifiers, longRangePenalty } from "../killchain/rules.js";
import type { MoraleStatus } from "../killchain/types.js";
import type { SideEntity } from "./sides.js";
import type { UnitEntity } from "./units.js";

export const sidePlacedAllUnits = (side: SideEntity) =>
  `${side.name} has placed all units.`;

export const unitAttackResult = (
  attacker: UnitEntity,
  defender: UnitEntity,
  roll: number,
  target: number,
  hit: boolean,
  mods: AttackModifiers,
) => {
  const flags: string[] = [defender.type.armour];
  if (mods.chargeBonus) flags.push("+charge");
  if (mods.flankingBonus) flags.push("+flank");
  if (mods.hillBonus) flags.push("+hill");
  if (mods.rangePenalty === longRangePenalty) flags.push("--range");
  else if (mods.rangePenalty) flags.push("-range");
  if (mods.woodsPenalty) flags.push("-woods");
  if (mods.archerBonus) flags.push("+archer");

  return `${attacker.name} rolls a ${roll} for attacking ${defender.name} (target ${target}: ${flags.join(", ")}). ${hit ? "Hit" : "Miss"}!`;
};

export const unitDispersed = (unit: UnitEntity) =>
  `${unit.name} are dispersed!`;

export const unitLosingCoherence = (unit: UnitEntity) =>
  `${unit.name} are losing coherence!`;

export const unitChangesMoraleStatus = (
  unit: UnitEntity,
  status: MoraleStatus,
) => `${unit.name} is now ${status}.`;

export const unitMoraleResult = (
  unit: UnitEntity,
  roll: number,
  status: MoraleStatus,
) =>
  `${unit.name} rolls a ${roll} for morale (ml ${unit.type.morale}); now ${status}.`;

export const sideSurpriseResult = (
  side: SideEntity,
  roll: number,
  surprised: boolean,
) =>
  `${side.name} rolled ${roll} for surprise: ${surprised ? "Surprised!" : "OK."}`;

export const sideInitiativeResult = (side: SideEntity, roll: number) =>
  `${side.name} rolled ${roll} for initiative.`;

export const battleRoutResult = () => "No units remain; a rout!";

export const battleVictoryResult = (side: SideEntity) =>
  `Only ${side.name} remains; victory!`;
