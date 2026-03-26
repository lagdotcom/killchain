import { createSelector } from "@reduxjs/toolkit";

import { isDefined } from "../tools.js";
import { sidesAdapter } from "./sides.js";
import type { RootState } from "./store.js";
import { terrainAdapter } from "./terrain.js";
import { unitsAdapter } from "./units.js";

export const { selectAll: selectAllSides, selectEntities: selectSideEntities } =
  sidesAdapter.getSelectors<RootState>((state) => state.sides);

export const {
  selectAll: selectAllTerrain,
  selectEntities: selectTerrainEntities,
} = terrainAdapter.getSelectors<RootState>((state) => state.terrain);

export const { selectAll: selectAllUnits, selectEntities: selectUnitEntities } =
  unitsAdapter.getSelectors<RootState>((state) => state.units);

export const selectPlacedUnits = createSelector([selectAllUnits], (units) =>
  units.filter((u) => !isNaN(u.x)),
);
export const selectUnplacedUnits = createSelector([selectAllUnits], (units) =>
  units.filter((u) => isNaN(u.x)),
);

export const selectBattle = (state: RootState) => state.battle;

export const selectActiveSideId = createSelector(
  [selectBattle],
  (battle) => battle.sideOrder[battle.sideIndex],
);

export const selectActiveSide = createSelector(
  [selectActiveSideId, selectSideEntities],
  (id, sides) => (isDefined(id) ? sides[id] : undefined),
);

export const selectActiveUnitId = createSelector(
  [selectBattle],
  (battle) => battle.activeUnitId,
);

export const selectActiveUnit = createSelector(
  [selectActiveUnitId, selectUnitEntities],
  (id, units) => (isDefined(id) ? units[id] : undefined),
);

export const selectLogMessages = createSelector(
  [selectBattle],
  (battle) => battle.messages,
);

export const selectPhase = createSelector(
  [selectBattle],
  (battle) => battle.phase,
);

export const selectTurn = createSelector(
  [selectBattle],
  (battle) => battle.turn,
);
