import { xyId } from "./killchain/EuclideanEngine.js";
import { type AttackModifiers, longRangePenalty } from "./killchain/rules.js";
import type { MoraleStatus } from "./killchain/types.js";
import type { MoraleStatusResult } from "./state/actions.js";
import type { LogMessage } from "./state/battle.js";
import type { SideEntity } from "./state/sides.js";
import type { UnitEntity } from "./state/units.js";

function focusUnit(unit: UnitEntity): Pick<LogMessage, "focus"> {
  return isNaN(unit.x) ? {} : { focus: xyId(unit.x, unit.y) };
}

export const sidePlacedAllUnits = (side: SideEntity): LogMessage => ({
  text: `${side.name} has placed all units.`,
});

export const unitAttackResult = (
  attacker: UnitEntity,
  defender: UnitEntity,
  roll: number,
  target: number,
  hit: boolean,
  mods: AttackModifiers,
): LogMessage => {
  const flags: string[] = [defender.type.armour];
  if (mods.chargeBonus) flags.push("+charge");
  if (mods.flankingBonus) flags.push("+flank");
  if (mods.hillBonus) flags.push("+hill");
  if (mods.rangePenalty === longRangePenalty) flags.push("--range");
  else if (mods.rangePenalty) flags.push("-range");
  if (mods.woodsPenalty) flags.push("-woods");
  if (mods.archerPenalty) flags.push("-archer");

  return {
    text: `${attacker.name} rolls a ${roll} for attacking ${defender.name} (target ${target}: ${flags.join(", ")}). ${hit ? "Hit" : "Miss"}!`,
    ...focusUnit(attacker),
  };
};

export const unitDispersed = (unit: UnitEntity): LogMessage => ({
  text: `${unit.name} are dispersed!`,
  ...focusUnit(unit),
});

export const unitLosingCoherence = (unit: UnitEntity): LogMessage => ({
  text: `${unit.name} are losing coherence!`,
  ...focusUnit(unit),
});

export const unitChangesMoraleStatus = (
  unit: UnitEntity,
  status: MoraleStatus,
): LogMessage => ({
  text: `${unit.name} is now ${status}.`,
  ...focusUnit(unit),
});

export const unitMoraleResult = (
  unit: UnitEntity,
  roll: number,
  status: MoraleStatus,
): LogMessage => ({
  text: `${unit.name} rolls a ${roll} for morale (ml ${unit.type.morale}); now ${status}.`,
  ...focusUnit(unit),
});

export const sideSurpriseResult = (
  side: SideEntity,
  roll: number,
  surprised: boolean,
): LogMessage => ({
  text: `${side.name} rolled ${roll} for surprise: ${surprised ? "Surprised!" : "OK."}`,
});

export const sideInitiativeResult = (
  side: SideEntity,
  roll: number,
): LogMessage => ({ text: `${side.name} rolled ${roll} for initiative.` });

export const unitRouting = (unit: UnitEntity): LogMessage => ({
  text: `${unit.name} are routing away from battle.`,
  ...focusUnit(unit),
});

export const unitFlees = (unit: UnitEntity): LogMessage => ({
  text: `${unit.name} flee the field!`,
  ...focusUnit(unit),
});

export const battleRoutResult = (): LogMessage => ({
  text: "No units remain; a rout!",
});

export const battleVictoryResult = (side: SideEntity): LogMessage => ({
  text: `Only ${side.name} remains; victory!`,
});

export function moraleStatusMessage(result: MoraleStatusResult): string {
  switch (result.type) {
    case "loser":
      return `${result.side.name} suffered the most casualties.`;
    case "none":
      return "No sides suffered casualties.";
    case "tied":
      return "All sides suffered equal casualties.";
  }
}
