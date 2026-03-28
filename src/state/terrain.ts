import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells, TerrainId } from "../flavours.js";
import type { Terrain } from "../killchain/types.js";

export interface TerrainEntity extends Terrain {
  id: TerrainId;
  x: Cells;
  y: Cells;
}

export const terrainAdapter = createEntityAdapter<TerrainEntity>();
const terrainSlice = createSlice({
  name: "terrain",
  initialState: terrainAdapter.getInitialState(),
  reducers: {},
});

export default terrainSlice.reducer;
