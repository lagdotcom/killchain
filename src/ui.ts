import type { Pixels } from "./flavours.js";
import { flatOrientation } from "./geometry/hex.js";
import type { Armour, MoraleStatus, TerrainType } from "./killchain/types.js";

export const armourAbbreviation: Record<Armour, string> = {
  Unarmoured: "-",
  Light: "L",
  Medium: "M",
  Heavy: "H",
};

export const cellSize: Pixels = 64;
export const hexCellSize: Pixels = cellSize / flatOrientation.f3;
export const shadowSize: Pixels = 8;

export const terrainColours: Record<TerrainType, string> = {
  Open: "#875",
  Woods: "#483",
  Marsh: "#666",
};

export const moraleColours: Record<MoraleStatus, string> = {
  Normal: "#2d7",
  Shaken: "#fa0",
  Rout: "#d33",
};
