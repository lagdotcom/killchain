import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

import type { SideId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { TerrainType, UnitType } from "./killchain/types.js";
import {
  heavyHorse,
  lightFoot,
  lightHorse,
  mediumFoot,
} from "./killchain/units.js";
import type { SideSetup } from "./state/actions.js";
import type { TerrainEntity } from "./state/terrain.js";
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
    damage: 0,
    moved: 0,
    status: "Normal",
    acted: false,
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

const noiseView =
  (noise: NoiseFunction2D, scale: number, offset: number = 0) =>
  (x: number, y: number) =>
    noise(x / scale + offset, y / scale);

export function generateTerrain() {
  const noise = createNoise2D();
  const getTerrainType = noiseView(noise, 10);
  const getElevation = noiseView(noise, 14, 200);

  const terrain: TerrainEntity[] = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
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

  return terrain;
}
