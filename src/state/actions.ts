import { createAction } from "@reduxjs/toolkit";

import type { Cells, Side } from "../flavours.js";
import { Phase, phaseChanges } from "../killchain/rules.js";
import { type BattleState, nextSide } from "./battle.js";
import type { SideState } from "./sides.js";
import type { UnitState } from "./units.js";

export type SideSetup = Omit<
  SideState,
  "casualties" | "initiative" | "unplacedIds" | "surprised"
>;

export const changePhaseAction = createAction<{
  oldPhase: Phase;
  phase: Phase;
  sideOrder: Side[] | undefined;
  turn: number;
}>("battle/changePhaseAction");

export const placeUnitAction = createAction<{
  side: SideState;
  unit: UnitState;
  x: Cells;
  y: Cells;
}>("battle/placeUnit");

export const setupBattleAction = createAction<{
  sides: SideSetup[];
  units: UnitState[];
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

export function pass(battle: BattleState, sides: SideState[]) {
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
