import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import shuffle from "knuth-shuffle-seeded";

import type { Side } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { without } from "../tools.js";
import {
  changePhaseAction,
  placeUnitAction,
  setupBattleAction,
} from "./actions.js";

export interface BattleState {
  turn: number;
  phase: Phase;
  sideOrder: Side[];
  sideIndex: number;
  messages: string[];
}

const initialState: BattleState = {
  turn: 0,
  phase: Phase.Placement,
  sideOrder: [],
  sideIndex: NaN,
  messages: [],
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

          if (sideOrder) {
            state.sideOrder = sideOrder;
            state.sideIndex = 0;
          }
        },
      ),
});

export const { addMessage, nextSide } = battleSlice.actions;

export default battleSlice.reducer;
