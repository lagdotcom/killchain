import type { Cells, Feet, SideId, TerrainId, UnitId } from "./flavours.js";
import { type XY, xyId } from "./killchain/EuclideanEngine.js";
import { Phase } from "./killchain/rules.js";
import { heavyFoot } from "./killchain/units.js";
import type { BattleState } from "./state/battle.js";
import type { MapEntity } from "./state/maps.js";
import type { SideEntity } from "./state/sides.js";
import type { TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";

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
      terrain[id] = { id, x, y, type: "Open", elevation: 0, ...overrides[id] };
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

export const defaultBattleState: BattleState = {
  activeUnitId: undefined,
  allianceMap: {},
  accumulatedZoneVP: {},
  battleLog: [],
  canPass: false,
  exitedUnitIds: [],
  finalVP: undefined,
  mapId: undefined,
  messages: [],
  phase: Phase.Placement,
  sideOrder: [],
  sideIndex: NaN,
  turn: 0,
  turnLimit: undefined,
  victoryConditions: [],
};

let _uid = 0;

/** Create a minimal UnitEntity for testing. Defaults to heavyFoot type, ready: false. */
export function makeUnit(
  partial: Partial<UnitEntity> & XY & { side: SideId },
): UnitEntity {
  return {
    id: `u${_uid++}`,
    name: "Unit",
    type: heavyFoot, // move=60ft at cellSize=10 → 6 cells per turn
    missile: false,
    flankCount: 0,
    damage: 0,
    moved: 0,
    status: "Normal",
    ready: false,
    ...partial,
  };
}

/** Create a minimal SideEntity for testing. */
export function makeSide(
  id: SideId,
  extra: Partial<SideEntity> = {},
): SideEntity {
  return {
    id,
    colour: "#fff",
    name: `Side ${id}`,
    unplacedIds: [],
    surprised: false,
    casualties: 0,
    initiative: 0,
    ...extra,
  };
}

/** Build a Record<UnitId, UnitEntity> from a list of units. */
export function unitMap(...units: UnitEntity[]): Record<UnitId, UnitEntity> {
  return Object.fromEntries(units.map((u) => [u.id, u]));
}
