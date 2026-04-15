import {
  type Action,
  type ActionCreator,
  createAction,
  nanoid,
  type ThunkAction,
} from "@reduxjs/toolkit";

import type { Cells, Feet, MapId, SideId, UnitId } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import {
  applyAttackModifiers,
  type AttackModifiers,
  getAttackModifiers,
  Phase,
  phaseChanges,
} from "../killchain/rules.js";
import type { MoraleStatus, UnitDefinition } from "../killchain/types.js";
import { KillChainEngine } from "../KillChainEngine.js";
import { canFleeBoard, findBestMove } from "../movement.js";
import { manhattanDistance, rollDice } from "../tools.js";
import { allowPass, type BattleState, nextSide } from "./battle.js";
import {
  selectActiveUnit,
  selectAllSides,
  selectAllUnits,
  selectBattle,
  selectMap,
  selectUnitEntities,
} from "./selectors.js";
import type { SideEntity } from "./sides.js";
import type { AppState } from "./store.js";
import type { UnitEntity } from "./units.js";

export type BattleOutcome =
  | { type: "victory"; who: SideEntity }
  | { type: "rout" };

export type SideSetup = Omit<
  SideEntity,
  "casualties" | "initiative" | "unplacedIds" | "surprised"
>;

export interface InitiativeRollResult {
  side: SideEntity;
  roll: number;
}

export interface MoraleRollResult {
  unit: UnitEntity;
  roll: number;
  pass: boolean;
  status: MoraleStatus;
}

export interface SurpriseRollResult {
  side: SideEntity;
  roll: number;
  surprised: boolean;
}

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

export const initiativeAction = createAction<{
  results: InitiativeRollResult[];
}>("battle/initiative");

export const moraleAction = createAction<{
  side: SideEntity | undefined;
  results: MoraleRollResult[];
  outcome: BattleOutcome | undefined;
}>("battle/morale");

export const routMoveAction = createAction<{
  unit: UnitEntity;
  x: Cells;
  y: Cells;
  fled: boolean;
  moved: Feet;
}>("battle/routMove");

export const moveAction = createAction<{
  unit: UnitEntity;
  x: Cells;
  y: Cells;
  cost: Feet;
}>("battle/move");

export const placeUnitAction = createAction<{
  side: SideEntity;
  unit: UnitEntity;
  x: Cells;
  y: Cells;
}>("battle/placeUnit");

export const setupBattleAction = createAction<{
  map: MapId;
  sides: SideSetup[];
  units: UnitEntity[];
}>("battle/setup");

/** Deploy a roster unit definition to a side's unplaced pool. */
export const deployUnitAction = createAction(
  "battle/deployUnit",
  (definition: UnitDefinition, sideId: SideId) => ({
    payload: {
      definition,
      sideId,
      unitId: nanoid() as UnitId,
    },
  }),
);

export const surpriseAction = createAction<{
  results: SurpriseRollResult[];
}>("battle/surprise");

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

export type MoraleStatusResult =
  | { side: SideEntity; type: "loser" }
  | { side?: undefined; type: "none" }
  | { side?: undefined; type: "tied" };

export function getMoraleStatus(sides: SideEntity[]): MoraleStatusResult {
  let threshold = 0;
  const matches: SideEntity[] = [];
  for (const side of sides) {
    if (side.casualties > threshold) {
      threshold = side.casualties;
      matches.splice(0, matches.length, side);
    } else if (side.casualties === threshold) matches.push(side);
  }

  const side = matches[0];
  if (side && matches.length === 1) return { side, type: "loser" };
  if (threshold === 0) return { type: "none" };
  return { type: "tied" };
}

type Thunk<T = void> = ActionCreator<ThunkAction<T, AppState, void, Action>>;

export const pass: Thunk = () => (dispatch, getState) => {
  const state = getState();
  const battle = selectBattle(state);
  const sides = selectAllSides(state);

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

    dispatch(changePhaseAction({ oldPhase, phase, turn, sideOrder }));

    if (phase === Phase.Move) dispatch(executeRoutMovement());

    if (phase === Phase.Morale && !getMoraleStatus(sides).side)
      dispatch(allowPass());
  } else dispatch(nextSide());
};

export const rollSurprise: Thunk = () => (dispatch, getState) => {
  const results: SurpriseRollResult[] = [];
  const sides = selectAllSides(getState());
  for (const side of sides) {
    const roll = rollDice(6);
    const surprised = roll < 3;
    results.push({ side, roll, surprised });
  }

  dispatch(surpriseAction({ results }));
};

export const rollInitiative: Thunk = () => (dispatch, getState) => {
  const results: InitiativeRollResult[] = [];
  const sides = selectAllSides(getState());

  for (const side of sides) {
    if (side.surprised) continue;

    const roll = rollDice(6);
    results.push({ side, roll });
  }

  dispatch(initiativeAction({ results }));
};

export const attack: Thunk = (defender: UnitEntity) => (dispatch, getState) => {
  const state = getState();
  const map = selectMap(state);
  const attacker = selectActiveUnit(state);
  if (!attacker || !map) return;

  const units = selectUnitEntities(state);

  const g = new KillChainEngine(map, units);

  const missile = g.getDistance(attacker, defender) > map.cellSize;

  const mods = getAttackModifiers(g, missile, attacker, defender);
  const target = applyAttackModifiers(mods);
  const roll = rollDice(6);
  const hit = roll >= target;

  dispatch(
    attackAction({
      attacker,
      defender,
      missile,
      mods,
      target,
      roll,
      hit,
    }),
  );
};

export const executeRoutMovement: Thunk = () => (dispatch, getState) => {
  const state = getState();
  const map = selectMap(state);
  if (!map) return;

  const units = selectAllUnits(state);
  const unitEntities = selectUnitEntities(state);

  const routUnits = units.filter((u) => u.status === "Rout" && !isNaN(u.x));
  if (routUnits.length === 0) return;

  // Routing units don't block each other — exclude them from pathfinding so
  // they can scatter past one another in the chaos of rout.
  const nonRoutEntities = Object.fromEntries(
    Object.entries(unitEntities).filter(([, u]) => u.status !== "Rout"),
  ) as Record<UnitId, UnitEntity>;

  for (const unit of routUnits) {
    // A unit flees the field if it can reach a map edge cell with movement
    // remaining — i.e. it would step off the board.
    if (canFleeBoard(unit, nonRoutEntities, map)) {
      dispatch(
        routMoveAction({
          unit,
          x: unit.x,
          y: unit.y,
          fled: true,
          moved: unit.type.move,
        }),
      );
      continue;
    }

    const enemies = units.filter(
      (u) => u.side !== unit.side && u.status !== "Rout" && !isNaN(u.x),
    );

    const nearestEnemy =
      enemies.length > 0
        ? enemies.reduce((a, b) =>
            manhattanDistance(unit, a) <= manhattanDistance(unit, b) ? a : b,
          )
        : null;

    // Terrain-aware pathfinding selects the actual destination on the board.
    // Score: maximise distance from the nearest enemy, or minimise distance
    // to the nearest board edge when no enemies remain.
    const score = nearestEnemy
      ? (node: XY) => manhattanDistance(node, nearestEnemy)
      : (node: XY) =>
          -Math.min(
            node.x,
            map.width - 1 - node.x,
            node.y,
            map.height - 1 - node.y,
          );

    const best = findBestMove(unit, nonRoutEntities, map, score);
    if (!best) continue;

    dispatch(
      routMoveAction({
        unit,
        x: best.x,
        y: best.y,
        fled: false,
        moved: best.cost,
      }),
    );
  }
};

export const rollMorale: Thunk =
  (side: SideEntity | undefined) => (dispatch, getState) => {
    const state = getState();
    const sides = selectAllSides(state);
    const units = selectAllUnits(state);

    const results: MoraleRollResult[] = [];
    const remaining = new Map<SideId, number>(sides.map((s) => [s.id, 0]));

    for (const unit of units) {
      if (unit.status === "Rout") continue;

      const needsRoll =
        (side !== undefined && unit.side === side.id) ||
        unit.status === "Shaken";
      if (!needsRoll) {
        remaining.set(unit.side, (remaining.get(unit.side) ?? 0) + 1);
        continue;
      }

      if (unit.type.steadfast) {
        if (unit.status === "Shaken")
          results.push({ unit, roll: NaN, pass: true, status: "Normal" });
        remaining.set(unit.side, (remaining.get(unit.side) ?? 0) + 1);
        continue;
      }

      const roll = rollDice(6) + rollDice(6);
      const pass = roll <= unit.type.morale && roll !== 12;
      const status: MoraleStatus = pass
        ? "Normal"
        : unit.status === "Normal"
          ? "Shaken"
          : "Rout";

      results.push({ unit, roll, pass, status });
      if (status !== "Rout")
        remaining.set(unit.side, (remaining.get(unit.side) ?? 0) + 1);
    }

    let outcome: BattleOutcome | undefined = undefined;
    const aliveSides = [...remaining.entries()]
      .filter(([, count]) => count > 0)
      .map(([id]) => id);
    if (aliveSides.length === 0) outcome = { type: "rout" };
    else if (aliveSides.length === 1) {
      const winner = sides.find((s) => s.id === aliveSides[0]);
      if (winner) outcome = { type: "victory", who: winner };
    }

    dispatch(moraleAction({ side, results, outcome }));
  };
