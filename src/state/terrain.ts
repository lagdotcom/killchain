import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells } from "../flavours.js";
import type { Terrain } from "../killchain/types.js";

export interface TerrainState extends Terrain {
  x: Cells;
  y: Cells;
  id: string;
}

export const terrainAdapter = createEntityAdapter<TerrainState>();
const terrainSlice = createSlice({
  name: "terrain",
  initialState: terrainAdapter.getInitialState(),
  reducers: {
    addTerrain: terrainAdapter.addOne,
    addTerrains: terrainAdapter.addMany,
    updateTerrain: terrainAdapter.updateOne,
    removeTerrain: terrainAdapter.removeOne,
  },
});

export const { addTerrain, addTerrains, updateTerrain, removeTerrain } =
  terrainSlice.actions;

export default terrainSlice.reducer;
