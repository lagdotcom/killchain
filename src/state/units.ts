import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells } from "../flavours.js";
import type { Unit } from "../killchain/types.js";

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
});

export const { addUnit, addUnits, updateUnit, removeUnit } = unitsSlice.actions;

export default unitsSlice.reducer;
