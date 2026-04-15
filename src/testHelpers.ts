import type { Cells, Feet, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { MapEntity } from "./state/maps.js";
import type { TerrainEntity } from "./state/terrain.js";

export function makeGridMap(
  width: Cells,
  height: Cells,
  cellSize: Feet = 10,
  overrides: Record<string, Partial<TerrainEntity>> = {},
): MapEntity {
  const terrain: Record<TerrainId, TerrainEntity> = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = xyId(x, y);
      terrain[id] = {
        id,
        x,
        y,
        type: "Open",
        elevation: 0,
        ...overrides[id],
      };
    }
  }

  return {
    id: "test",
    layout: "square",
    width,
    height,
    cellSize,
    cells: { entities: terrain, ids: Object.keys(terrain) },
  };
}
