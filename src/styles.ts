import type { Cells, Pixels } from "./flavours.js";
import type { MoraleStatus, TerrainType } from "./killchain/types.js";

export const cellSize: Pixels = 64;
export const shadowSize: Pixels = 8;

export const mapWidth: Cells = 20;
export const mapHeight: Cells = 20;

export const terrainColours: Record<TerrainType, string> = {
  Open: "#875",
  Woods: "#483",
  Marsh: "#666",
};

export const sideColours = ["#f66", "#49e", "#fa0", "#7b6"];

export const moraleColours: Record<MoraleStatus, string> = {
  Normal: "#2d7",
  Shaken: "#fa0",
  Rout: "#d33",
};
