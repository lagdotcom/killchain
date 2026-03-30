import {
  createEntityAdapter,
  createSlice,
  type EntityState,
} from "@reduxjs/toolkit";

import type { Cells, Feet, MapId, TerrainId } from "../flavours.js";
import type { TerrainEntity } from "./terrain.js";

export type MapLayout = "square";

export interface MapEntity {
  id: MapId;
  layout: MapLayout;
  width: Cells;
  height: Cells;
  cellSize: Feet;
  cells: EntityState<TerrainEntity, TerrainId>;
}

export const mapsAdapter = createEntityAdapter<MapEntity>();
const mapsSlice = createSlice({
  name: "maps",
  initialState: mapsAdapter.getInitialState(),
  reducers: {},
});

export default mapsSlice.reducer;
