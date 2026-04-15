import { createSelector } from "@reduxjs/toolkit";

import { Phase } from "../killchain/rules.js";
import { isDefined } from "../tools.js";
import { mapsAdapter } from "./maps.js";
import { rosterAdapter } from "./roster.js";
import { sidesAdapter } from "./sides.js";
import type { AppState } from "./store.js";
import { terrainAdapter } from "./terrain.js";
import { unitsAdapter } from "./units.js";

export const { selectAll: selectAllMaps, selectEntities: selectMapEntities } =
  mapsAdapter.getSelectors<AppState>((state) => state.maps);

export const {
  selectAll: selectAllDefinitions,
  selectEntities: selectDefinitionEntities,
} = rosterAdapter.getSelectors<AppState>((state) => state.roster);

export const { selectAll: selectAllSides, selectEntities: selectSideEntities } =
  sidesAdapter.getSelectors<AppState>((state) => state.sides);

export const {
  selectAll: selectAllTerrain,
  selectEntities: selectTerrainEntities,
} = terrainAdapter.getSelectors<AppState>((state) => state.terrain);

export const { selectAll: selectAllUnits, selectEntities: selectUnitEntities } =
  unitsAdapter.getSelectors<AppState>((state) => state.units);

export const selectPlacedUnits = createSelector([selectAllUnits], (units) =>
  units.filter((u) => !isNaN(u.x)),
);
export const selectUnplacedUnits = createSelector([selectAllUnits], (units) =>
  units.filter((u) => isNaN(u.x)),
);

export const selectBattle = (state: AppState) => state.battle;

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

export const selectCanPass = createSelector(
  [selectBattle],
  (battle) => battle.canPass,
);

export const selectCanPassNow = createSelector(
  [selectBattle, selectActiveSide, selectAllUnits],
  (battle, activeSide, units) => {
    if (!battle.canPass) return false;
    if (battle.phase !== Phase.Move || !activeSide) return true;

    // Block passing while any Shaken unit of the active side is still in melee
    return !units.some(
      (unit) =>
        unit.side === activeSide.id &&
        unit.status === "Shaken" &&
        !isNaN(unit.x) &&
        units.some(
          (e) =>
            e.side !== unit.side &&
            e.status !== "Rout" &&
            !isNaN(e.x) &&
            Math.abs(e.x - unit.x) + Math.abs(e.y - unit.y) === 1,
        ),
    );
  },
);

export const selectLogMessages = createSelector(
  [selectBattle],
  (battle) => battle.messages,
);

export const selectMap = createSelector(
  [selectBattle, selectMapEntities],
  (battle, maps) => (battle.mapId ? maps[battle.mapId] : undefined),
);

export const selectPhase = createSelector(
  [selectBattle],
  (battle) => battle.phase,
);

export const selectTurn = createSelector(
  [selectBattle],
  (battle) => battle.turn,
);
