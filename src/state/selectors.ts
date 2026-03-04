import type { RootState } from "./store.js";
import { terrainAdapter } from "./terrain.js";
import { unitsAdapter } from "./units.js";

export const {
  selectAll: selectAllTerrain,
  selectEntities: selectTerrainEntities,
} = terrainAdapter.getSelectors<RootState>((state) => state.terrain);

export const { selectAll: selectAllUnits, selectEntities: selectUnitEntities } =
  unitsAdapter.getSelectors<RootState>((state) => state.units);
