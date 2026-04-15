import { createEntityAdapter, createSlice, nanoid } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { Cells, MapId, ScenarioId, SideId, UnitDefinitionId } from "../flavours.js";

// ---------------------------------------------------------------------------
// Future-proof extension points — currently empty stubs.
// Fill these in as the features are implemented rather than deleting them.
// ---------------------------------------------------------------------------

/** Future: restrict where a side may place units during deployment.
 *  e.g. { rows: { yMin: 0, yMax: 3 } } or { cells: TerrainId[] } */
export interface DeploymentZone {}

/** Future: a condition that causes a side to win or the battle to end.
 *  e.g. { type: "rout_all" } or { type: "occupy_cell", cellId, sideId } */
export interface VictoryCondition {}

/** Future: per-scenario overrides for optional rules.
 *  e.g. cavalryCharge?: boolean; morale12AlwaysFails?: boolean */
export interface RuleOverrides {}

// ---------------------------------------------------------------------------
// Core scenario types
// ---------------------------------------------------------------------------

export interface ScenarioUnitSetup {
  definitionId: UnitDefinitionId;
  /** Present and valid ⇒ unit is pre-placed at this cell.
   *  Absent ⇒ unit is deployable (dragged onto the map during Placement). */
  x?: Cells;
  y?: Cells;
}

export interface ScenarioSideSetup {
  id: SideId;
  name: string;
  colour: string;
  units: ScenarioUnitSetup[];
  /** Future: restrict cells this side can deploy to. */
  deploymentZone?: DeploymentZone;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  mapId: MapId;
  sides: ScenarioSideSetup[];
  /** Future: evaluated after each action to determine the battle outcome. */
  victoryConditions?: VictoryCondition[];
  /** Future: override optional rule flags for this scenario only. */
  rules?: RuleOverrides;
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const scenariosAdapter = createEntityAdapter<Scenario>();

const scenariosSlice = createSlice({
  name: "scenarios",
  initialState: scenariosAdapter.getInitialState(),
  reducers: {
    addScenario: {
      reducer: scenariosAdapter.addOne,
      prepare: (s: Omit<Scenario, "id">) => ({
        payload: { ...s, id: nanoid() as ScenarioId },
      }),
    },
    updateScenario(
      state,
      { payload }: PayloadAction<{ id: ScenarioId; changes: Omit<Scenario, "id"> }>,
    ) {
      const existing = state.entities[payload.id];
      if (existing) Object.assign(existing, payload.changes);
    },
    removeScenario: scenariosAdapter.removeOne,
    /** Replace the entire list (used by JSON import). */
    setAllScenarios: scenariosAdapter.setAll,
  },
});

export const {
  addScenario,
  updateScenario,
  removeScenario,
  setAllScenarios,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;
