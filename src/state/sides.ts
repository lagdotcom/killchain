import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { SideId, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { without } from "../tools.js";
import {
  attackAction,
  changePhaseAction,
  placeUnitAction,
  setupBattleAction,
} from "./actions.js";

export interface SideEntity {
  id: SideId;
  colour: string;
  name: string;
  unplacedIds: UnitId[];
  surprised: boolean;
  casualties: number;
  initiative: number;
}

export const sidesAdapter = createEntityAdapter<SideEntity>();
const sidesSlice = createSlice({
  name: "sides",
  initialState: sidesAdapter.getInitialState(),
  reducers: {
    updateSide: sidesAdapter.updateOne,
  },
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { sides, units } }) =>
        sidesAdapter.setAll(
          state,
          sides.map((side) => ({
            ...side,
            casualties: 0,
            initiative: NaN,
            surprised: false,
            unplacedIds: units
              .filter((u) => isNaN(u.x) && u.side === side.id)
              .map((u) => u.id),
          })),
        ),
      )
      .addCase(placeUnitAction, (state, { payload: { side, unit } }) =>
        sidesAdapter.updateOne(state, {
          id: side.id,
          changes: { unplacedIds: without(side.unplacedIds, unit.id) },
        }),
      )
      .addCase(changePhaseAction, (state, { payload: { phase } }) => {
        if (phase === Phase.Morale)
          for (const id of state.ids) state.entities[id]!.surprised = false;
      })
      .addCase(attackAction, (state, { payload }) => {
        if (payload.hit) state.entities[payload.defender.side]!.casualties++;
      }),
});

export const { updateSide } = sidesSlice.actions;

export default sidesSlice.reducer;
