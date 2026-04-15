import {
  createEntityAdapter,
  createSlice,
  type EntityState,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type { Cells, Feet, MapId, TerrainId } from "../flavours.js";
import type { TerrainType } from "../killchain/types.js";
import type { TerrainEntity } from "./terrain.js";

export type MapLayout = "square";

export interface MapEntity {
  id: MapId;
  name?: string;
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
  reducers: {
    addMap(state, { payload }: PayloadAction<MapEntity>) {
      mapsAdapter.addOne(state, payload);
    },
    deleteMap(state, { payload: mapId }: PayloadAction<MapId>) {
      mapsAdapter.removeOne(state, mapId);
    },
    renameMap(
      state,
      { payload }: PayloadAction<{ mapId: MapId; name: string }>,
    ) {
      const map = state.entities[payload.mapId];
      if (map) map.name = payload.name;
    },
    updateCell(
      state,
      {
        payload,
      }: PayloadAction<{
        mapId: MapId;
        cellId: TerrainId;
        changes: { type?: TerrainType; elevation?: number };
      }>,
    ) {
      const map = state.entities[payload.mapId];
      if (!map) return;
      const cell = map.cells.entities[payload.cellId];
      if (!cell) return;
      if (payload.changes.type !== undefined) cell.type = payload.changes.type;
      if (payload.changes.elevation !== undefined)
        cell.elevation = payload.changes.elevation;
    },
  },
});

export const { addMap, deleteMap, renameMap, updateCell } = mapsSlice.actions;
export default mapsSlice.reducer;
