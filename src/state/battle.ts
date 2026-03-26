import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import shuffle from "knuth-shuffle-seeded";

import type { SideId, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { without } from "../tools.js";
import {
  attackAction,
  changePhaseAction,
  moveAction,
  placeUnitAction,
  setupBattleAction,
} from "./actions.js";

export interface BattleState {
  activeUnitId: UnitId | undefined;
  messages: string[];
  phase: Phase;
  sideOrder: SideId[];
  sideIndex: number;
  turn: number;
}

const initialState: BattleState = {
  activeUnitId: undefined,
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
    addMessage(state, { payload }: PayloadAction<string>) {
      state.messages.push(payload);
    },
    nextSide(state) {
      state.sideIndex++;
      state.activeUnitId = undefined;
    },
    setActiveUnitId(state, { payload }: PayloadAction<UnitId | undefined>) {
      state.activeUnitId = payload;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { sides } }) => {
        state.sideOrder = shuffle(sides.map((side) => side.id));
        state.sideIndex = 0;
        state.phase = Phase.Placement;
      })
      .addCase(placeUnitAction, (state, { payload: { side } }) => {
        if (side.unplacedIds.length === 1) {
          state.messages.push(`${side.name} has placed all units.`);

          if (state.sideOrder.length === 1) {
            state.sideOrder = [];
            state.sideIndex = NaN;
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
          } else state.sideIndex = NaN;
        },
      )
      .addCase(
        attackAction,
        (state, { payload: { attacker, defender, target, roll, hit } }) => {
          state.messages.push(
            `${attacker.name} attacks ${defender.name}. Target is ${target}, rolled ${roll}. ${hit ? "Hit" : "Miss"}!`,
          );
          state.activeUnitId = undefined;

          if (hit && defender.damage + 1 >= defender.type.hits)
            state.messages.push(`${defender.name} are dispersed!`);
        },
      )
      .addCase(moveAction, (state, { payload: { unit, cost } }) => {
        if (unit.moved + cost >= unit.type.move) state.activeUnitId = undefined;
      }),
});

export const { addMessage, nextSide, setActiveUnitId } = battleSlice.actions;

export default battleSlice.reducer;
