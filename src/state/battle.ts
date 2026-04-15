import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import shuffle from "knuth-shuffle-seeded";

import type { MapId, SideId, TerrainId, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import {
  battleRoutResult,
  battleVictoryResult,
  sideInitiativeResult,
  sidePlacedAllUnits,
  sideSurpriseResult,
  unitAttackResult,
  unitChangesMoraleStatus,
  unitDispersed,
  unitFlees,
  unitLosingCoherence,
  unitMoraleResult,
  unitRouting,
} from "../messages.js";
import { without } from "../tools.js";
import {
  attackAction,
  changePhaseAction,
  initiativeAction,
  moraleAction,
  moveAction,
  placeUnitAction,
  routMoveAction,
  setupBattleAction,
  surpriseAction,
} from "./actions.js";

export interface LogMessage {
  text: string;
  focus?: TerrainId;
}

export interface BattleState {
  activeUnitId: UnitId | undefined;
  canPass: boolean;
  mapId: MapId | undefined;
  messages: LogMessage[];
  phase: Phase;
  sideOrder: SideId[];
  sideIndex: number;
  turn: number;
}

const initialState: BattleState = {
  activeUnitId: undefined,
  canPass: false,
  mapId: undefined,
  messages: [],
  phase: Phase.Placement,
  sideOrder: [],
  sideIndex: NaN,
  turn: 0,
};

export const battleSlice = createSlice({
  name: "battle",
  initialState,
  reducers: {
    allowPass(state) {
      state.canPass = true;
    },
    nextSide(state) {
      state.sideIndex++;
      state.activeUnitId = undefined;
    },
    setActiveUnitId(state, { payload }: PayloadAction<UnitId | undefined>) {
      state.activeUnitId = payload;
    },
    setMap(state, { payload }: PayloadAction<MapId>) {
      state.mapId = payload;
      state.activeUnitId = undefined;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { map, sides, units } }) => {
        // Sides that still have deployable (unplaced) units rotate through Placement.
        // Sides where every unit is pre-placed are skipped immediately.
        const deployable = sides
          .filter((s) => units.some((u) => u.side === s.id && isNaN(u.x)))
          .map((s) => s.id);
        state.activeUnitId = undefined;
        state.canPass = deployable.length === 0;
        state.mapId = map;
        state.messages = [];
        state.phase = Phase.Placement;
        state.sideIndex = deployable.length > 0 ? 0 : NaN;
        state.sideOrder = shuffle(deployable);
        state.turn = 0;
      })
      .addCase(placeUnitAction, (state, { payload: { side } }) => {
        if (side.unplacedIds.length === 1) {
          state.messages.push(sidePlacedAllUnits(side));

          if (state.sideOrder.length === 1) {
            state.sideOrder = [];
            state.sideIndex = NaN;
            state.canPass = true;
            return;
          }
          state.sideOrder = without(state.sideOrder, side.id);
        }

        state.sideIndex = (state.sideIndex + 1) % state.sideOrder.length;
      })
      .addCase(
        changePhaseAction,
        (state, { payload: { phase, turn, sideOrder } }) => {
          state.phase = phase;
          state.turn = turn;
          state.activeUnitId = undefined;

          if (sideOrder) {
            state.sideOrder = sideOrder;
            state.sideIndex = 0;
          } else {
            state.sideIndex = NaN;
            state.canPass = false;
          }
        },
      )
      .addCase(
        attackAction,
        (
          state,
          { payload: { attacker, defender, hit, missile, mods, roll, target } },
        ) => {
          state.messages.push(
            unitAttackResult(attacker, defender, roll, target, hit, mods),
          );
          state.activeUnitId = undefined;

          if (hit && defender.damage + 1 >= defender.type.hits)
            state.messages.push(
              missile ? unitDispersed(defender) : unitLosingCoherence(defender),
            );
        },
      )
      .addCase(moveAction, (state, { payload: { unit, cost } }) => {
        if (unit.moved + cost >= unit.type.move) state.activeUnitId = undefined;
      })
      .addCase(moraleAction, (state, { payload: { outcome, results } }) => {
        state.canPass = true;
        for (const { unit, roll, status } of results) {
          if (isNaN(roll))
            state.messages.push(unitChangesMoraleStatus(unit, status));
          else state.messages.push(unitMoraleResult(unit, roll, status));
        }

        if (outcome) {
          state.messages.push(
            outcome.type === "rout"
              ? battleRoutResult()
              : battleVictoryResult(outcome.who),
          );
          state.canPass = false;
          state.sideIndex = NaN;
          state.phase = Phase.Completed;
        }
      })
      .addCase(routMoveAction, (state, { payload: { unit, fled } }) => {
        state.messages.push(fled ? unitFlees(unit) : unitRouting(unit));
      })
      .addCase(surpriseAction, (state, { payload: { results } }) => {
        state.canPass = true;
        for (const { side, roll, surprised } of results)
          state.messages.push(sideSurpriseResult(side, roll, surprised));
      })
      .addCase(initiativeAction, (state, { payload: { results } }) => {
        state.canPass = true;
        for (const { side, roll } of results)
          state.messages.push(sideInitiativeResult(side, roll));
      }),
});

export const { allowPass, nextSide, setActiveUnitId, setMap } =
  battleSlice.actions;

export default battleSlice.reducer;
