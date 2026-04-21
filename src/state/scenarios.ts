import type { PayloadAction } from "@reduxjs/toolkit";
import { createEntityAdapter, createSlice, nanoid } from "@reduxjs/toolkit";

import type {
  Cells,
  MapId,
  ScenarioId,
  SideId,
  UnitDefinitionId,
  UnitId,
  VictoryPoints,
} from "../flavours.js";
import type { DeploymentZone } from "../killchain/types.js";
import type { AiPersonality } from "./sides.js";

export type { DeploymentZone };

// ---------------------------------------------------------------------------
// Victory conditions
// ---------------------------------------------------------------------------

/** A rectangular map region used for zone-based victory conditions. */
export interface VictoryZone {
  x: Cells;
  y: Cells;
  width: Cells;
  height: Cells;
}

export type VictoryCondition =
  // attrition
  | { type: "surviving_units"; sideId: SideId; points: VictoryPoints }
  | { type: "units_destroyed"; sideId: SideId; points: VictoryPoints }
  | { type: "enemy_routed"; sideId: SideId; points: VictoryPoints }
  // specific unit
  | {
      type: "unit_eliminated";
      unitId: UnitId;
      sideId: SideId;
      points: VictoryPoints;
    }
  | {
      type: "unit_survives";
      unitId: UnitId;
      sideId: SideId;
      points: VictoryPoints;
    }
  | { type: "exit_unit"; unitId: UnitId; sideId: SideId; points: VictoryPoints }
  // zone control
  | {
      type: "control_zone";
      zone: VictoryZone;
      sideId: SideId;
      points: VictoryPoints;
    }
  | {
      type: "zone_violated";
      zone: VictoryZone;
      sideId: SideId;
      points: VictoryPoints;
    }
  | {
      type: "zone_held_turns";
      zone: VictoryZone;
      sideId: SideId;
      points: VictoryPoints;
    }
  // temporal
  | { type: "turns_survived"; sideId: SideId; points: VictoryPoints };

/** Per-scenario overrides for optional rules. */
export interface RuleOverrides {
  turnLimit?: number;
}

// ---------------------------------------------------------------------------
// Core scenario types
// ---------------------------------------------------------------------------

export interface ScenarioUnitSetup {
  definitionId: UnitDefinitionId;
  /** Instance name for this unit (e.g. "Heralds of Mikius"). */
  name: string;
  /** 1-4 char abbreviation shown on the token; auto-derived if absent. */
  shortName?: string;
  /** True if this unit carries a missile weapon. */
  missile?: boolean;
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
  aiPersonality?: AiPersonality;
  /** Sides sharing the same allianceId are friendly to each other. */
  allianceId?: number;
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
      // eslint-disable-next-line @typescript-eslint/unbound-method
      reducer: scenariosAdapter.addOne,
      prepare: (s: Omit<Scenario, "id">) => ({
        payload: { ...s, id: nanoid() as ScenarioId },
      }),
    },
    updateScenario(
      state,
      {
        payload,
      }: PayloadAction<{ id: ScenarioId; changes: Omit<Scenario, "id"> }>,
    ) {
      const existing = state.entities[payload.id];
      if (existing) Object.assign(existing, payload.changes);
    },
    // eslint-disable-next-line @typescript-eslint/unbound-method
    removeScenario: scenariosAdapter.removeOne,
    /** Replace the entire list (used by JSON import). */
    // eslint-disable-next-line @typescript-eslint/unbound-method
    setAllScenarios: scenariosAdapter.setAll,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upsertScenario: scenariosAdapter.upsertOne,
  },
});

export const {
  addScenario,
  updateScenario,
  removeScenario,
  setAllScenarios,
  upsertScenario,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;
