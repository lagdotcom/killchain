import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { TerrainId } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import type { Terrain } from "../killchain/types.js";

export interface TerrainEntity extends Terrain, XY {
  id: TerrainId;
}

export const terrainAdapter = createEntityAdapter<TerrainEntity>();
const terrainSlice = createSlice({
  name: "terrain",
  initialState: terrainAdapter.getInitialState(),
  reducers: {},
});

export default terrainSlice.reducer;
