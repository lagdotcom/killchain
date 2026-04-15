import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import SeedRandom from "seed-random";

import type { Cells, Feet, MapId, ScenarioId, SideId, UnitDefinitionId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { TerrainType, UnitDefinition, UnitType } from "./killchain/types.js";
import type { Scenario } from "./state/scenarios.js";
import {
  heavyHorse,
  lightFoot,
  lightHorse,
  mediumFoot,
} from "./killchain/units.js";
import type { SideSetup } from "./state/actions.js";
import type { MapEntity } from "./state/maps.js";
import { terrainAdapter, type TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";

function makeUnit(
  side: SideId,
  name: string,
  type: UnitType,
  missile: boolean = false,
): UnitEntity {
  return {
    id: `${side}-${name}`,
    name,
    type,
    missile,
    side,
    x: NaN,
    y: NaN,
    flankCount: 0,
    damage: 0,
    moved: 0,
    status: "Normal",
    ready: false,
  };
}

export const defaultUnits = [
  makeUnit(0, "Heralds of Mikius", heavyHorse, true),
  makeUnit(0, "Bakhtavornery", lightFoot, true),
  makeUnit(0, "Eyin Eweko", lightFoot, true),
  makeUnit(1, "Chosen of Grund", mediumFoot, true),
  makeUnit(1, "Beloved of Grund", mediumFoot, true),
  makeUnit(1, "Outriders of Grund", lightHorse),
];

export const defaultSides: SideSetup[] = [
  { id: 0, name: "Regnum-Fey Alliance", colour: "#49e" },
  { id: 1, name: "Horde of Grund", colour: "#f66" },
];

/** Initial roster pre-populated with the units from the default battle. */
export const defaultDefinitions: UnitDefinition[] = [
  {
    id: "def-heralds-of-mikius" as UnitDefinitionId,
    name: "Heralds of Mikius",
    type: heavyHorse,
    missile: true,
  },
  {
    id: "def-bakhtavornery" as UnitDefinitionId,
    name: "Bakhtavornery",
    type: lightFoot,
    missile: true,
  },
  {
    id: "def-eyin-eweko" as UnitDefinitionId,
    name: "Eyin Eweko",
    type: lightFoot,
    missile: true,
  },
  {
    id: "def-chosen-of-grund" as UnitDefinitionId,
    name: "Chosen of Grund",
    type: mediumFoot,
    missile: true,
  },
  {
    id: "def-beloved-of-grund" as UnitDefinitionId,
    name: "Beloved of Grund",
    type: mediumFoot,
    missile: true,
  },
  {
    id: "def-outriders-of-grund" as UnitDefinitionId,
    name: "Outriders of Grund",
    type: lightHorse,
  },
];

/** Default scenario matching the hard-coded initial battle. */
export const defaultScenario: Scenario = {
  id: "default-scenario" as ScenarioId,
  name: "Default Scenario",
  mapId: "default" as MapId,
  sides: [
    {
      id: 0 as SideId,
      name: "Regnum-Fey Alliance",
      colour: "#49e",
      units: [
        { definitionId: "def-heralds-of-mikius" as UnitDefinitionId },
        { definitionId: "def-bakhtavornery" as UnitDefinitionId },
        { definitionId: "def-eyin-eweko" as UnitDefinitionId },
      ],
    },
    {
      id: 1 as SideId,
      name: "Horde of Grund",
      colour: "#f66",
      units: [
        { definitionId: "def-chosen-of-grund" as UnitDefinitionId },
        { definitionId: "def-beloved-of-grund" as UnitDefinitionId },
        { definitionId: "def-outriders-of-grund" as UnitDefinitionId },
      ],
    },
  ],
};

const noiseView =
  (noise: NoiseFunction2D, scale: number, offset: number = 0) =>
  (x: number, y: number) =>
    noise(x / scale + offset, y / scale);

export function generateGridMap(
  id: MapId,
  cellSize: Feet,
  width: Cells,
  height: Cells,
  seed?: number,
  name?: string,
): MapEntity {
  const noise = createNoise2D(
    seed !== undefined ? SeedRandom(String(seed)) : undefined,
  );
  const getTerrainType = noiseView(noise, 10);
  const getElevation = noiseView(noise, 14, 200);

  const terrain: TerrainEntity[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rawElevation = (getElevation(x, y) + 1) * 1.5; // 0 to 3

      const elevation = Math.floor(rawElevation);
      const marshThreshold = -0.5 - rawElevation * 0.2; // -0.5 to -1.1

      const typeValue = getTerrainType(x, y);
      let type: TerrainType = "Open";

      if (typeValue > 0.3) type = "Woods";
      else if (typeValue < marshThreshold) type = "Marsh";

      terrain.push({ id: xyId(x, y), x, y, type, elevation });
    }
  }

  return {
    id,
    ...(name !== undefined && { name }),
    layout: "square",
    cellSize,
    width,
    height,
    cells: terrainAdapter.getInitialState(undefined, terrain),
  };
}
