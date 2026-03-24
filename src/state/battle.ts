import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Side } from "../flavours.js";

export enum BattlePhase {
  Placement,
  PreBattle,
  Surprise,
  Initiative,
  Missile,
  Move,
  Melee,
  Morale,
}

export interface SideData {
  id: Side;
  colour: string;
  name: string;
  unplacedIds: string[];
  casualties: number;
  initiative: number;
}

export type SideInit = Omit<SideData, "casualties" | "initiative">;

export interface BattleState {
  turn: number;
  phase: BattlePhase;
  sides: Record<Side, SideData>;
  placementOrder: Side[];
  sidePlacing: Side | undefined;
}

const initialState: BattleState = {
  turn: 0,
  phase: BattlePhase.Placement,
  sides: {},
  placementOrder: [],
  sidePlacing: undefined,
};

export const battleSlice = createSlice({
  name: "battle",
  initialState,
  reducers: {
    setPhase(state, { payload }: PayloadAction<BattlePhase>) {
      state.phase = payload;
    },
    setTurn(
      state,
      { payload }: PayloadAction<{ turn: number; phase: BattlePhase }>,
    ) {
      state.turn = payload.turn;
      state.phase = payload.phase;
    },
    startPlacement(state, { payload }: PayloadAction<SideInit[]>) {
      // Roll initiative for each side
      const sides = payload
        .map((init) => ({
          ...init,
          initiative: Math.floor(Math.random() * 6) + 1,
          casualties: 0,
        }))
        .sort((a, b) => b.initiative - a.initiative);

      state.placementOrder = sides.map((s) => s.id);
      state.sides = Object.fromEntries(sides.map((side) => [side.id, side]));
      state.phase = BattlePhase.Placement;
      state.sidePlacing = state.placementOrder[0]!;
    },
    placeUnit(state, { payload }: PayloadAction<string>) {
      const currentIndex = state.placementOrder.findIndex(
        (value) => value === state.sidePlacing,
      );

      const side = state.sides[state.sidePlacing!]!;
      side.unplacedIds = side.unplacedIds.filter((id) => id !== payload);
      if (side.unplacedIds.length === 0) {
        state.placementOrder = state.placementOrder.filter(
          (value) => value !== side.id,
        );
        if (state.placementOrder.length === 0) {
          state.phase = BattlePhase.PreBattle;
          state.sidePlacing = undefined;
        }

        state.sidePlacing = state.placementOrder[currentIndex];
        return;
      }

      // Move to next side that has unplaced units
      const nextIndex = (currentIndex + 1) % state.placementOrder.length;
      state.sidePlacing = state.placementOrder[nextIndex];
    },
  },
});

export const { setPhase, setTurn, startPlacement, placeUnit } =
  battleSlice.actions;

export default battleSlice.reducer;
