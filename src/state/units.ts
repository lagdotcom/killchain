import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells } from "../flavours.js";
import type { Unit } from "../killchain/types.js";
import { placeUnitAction, setupBattleAction } from "./actions.js";

export interface UnitState extends Unit {
  id: string;
  x: Cells;
  y: Cells;
}

export const unitsAdapter = createEntityAdapter<UnitState>();
const unitsSlice = createSlice({
  name: "units",
  initialState: unitsAdapter.getInitialState(),
  reducers: {
    addUnit: unitsAdapter.addOne,
    addUnits: unitsAdapter.addMany,
    updateUnit: unitsAdapter.updateOne,
    removeUnit: unitsAdapter.removeOne,
  },
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { units } }) =>
        unitsAdapter.setAll(state, units),
      )
      .addCase(placeUnitAction, (state, { payload: { unit, x, y } }) =>
        unitsAdapter.updateOne(state, { id: unit.id, changes: { x, y } }),
      ),
});

export const { addUnit, addUnits, updateUnit, removeUnit } = unitsSlice.actions;

export default unitsSlice.reducer;
