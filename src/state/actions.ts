import { createAction } from "@reduxjs/toolkit";

import type { Cells, SideId, TerrainId, UnitId } from "../flavours.js";
import {
  type AttackModifiers,
  getAttackModifiers,
  Phase,
  phaseChanges,
} from "../killchain/rules.js";
import { KillChainEngine } from "../KillChainEngine.js";
import { rollDice } from "../tools.js";
import { type BattleState, nextSide } from "./battle.js";
import type { SideEntity } from "./sides.js";
import type { TerrainEntity } from "./terrain.js";
import type { UnitEntity } from "./units.js";

export type SideSetup = Omit<
  SideEntity,
  "casualties" | "initiative" | "unplacedIds" | "surprised"
>;

export const attackAction = createAction<{
  attacker: UnitEntity;
  defender: UnitEntity;
  missile: boolean;
  mods: AttackModifiers;
  target: number;
  roll: number;
  hit: boolean;
}>("battle/attack");

export const changePhaseAction = createAction<{
  oldPhase: Phase;
  phase: Phase;
  sideOrder: SideId[] | undefined;
  turn: number;
}>("battle/changePhaseAction");

export const moveAction = createAction<{
  unit: UnitEntity;
  x: Cells;
  y: Cells;
  cost: Cells;
}>("battle/move");

export const placeUnitAction = createAction<{
  side: SideEntity;
  unit: UnitEntity;
  x: Cells;
  y: Cells;
}>("battle/placeUnit");

export const setupBattleAction = createAction<{
  sides: SideSetup[];
  units: UnitEntity[];
}>("battle/setup");

function shouldChangePhase(battle: BattleState) {
  switch (battle.phase) {
    case Phase.Placement:
    case Phase.Surprise:
    case Phase.Initiative:
    case Phase.Morale:
      return true;

    default:
      return battle.sideIndex + 1 >= battle.sideOrder.length;
  }
}

export function pass(battle: BattleState, sides: SideEntity[]) {
  if (shouldChangePhase(battle)) {
    const oldPhase = battle.phase;

    const change = phaseChanges[battle.phase];

    const phase = change.phase;
    const turn = battle.turn + (change.nextTurn ? 1 : 0);

    const sideOrder = change.useSides
      ? sides
          .filter((s) => !s.surprised)
          .toSorted((a, b) => b.initiative - a.initiative)
          .map((s) => s.id)
      : undefined;

    return changePhaseAction({ oldPhase, phase, turn, sideOrder });
  }

  return nextSide();
}

export function attack(
  attacker: UnitEntity,
  defender: UnitEntity,
  terrain: Record<TerrainId, TerrainEntity>,
  units: Record<UnitId, UnitEntity>,
) {
  const g = new KillChainEngine(terrain, units);

  const missile = g.getDistance(attacker, defender) > 1;

  const mods = getAttackModifiers(g, missile, attacker, defender);

  const target =
    mods.armour + mods.rangePenalty + mods.woodsPenalty - mods.hillBonus;

  const roll = rollDice(6);
  const hit = roll >= target;

  return attackAction({ attacker, defender, missile, mods, target, roll, hit });
}
