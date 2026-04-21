import type { Cells, Feet, SideId, UnitDefinitionId } from "../flavours.js";

export interface UnitType {
  name: string;
  hits: number;
  armour: Armour;
  mounted?: boolean;
  flying?: boolean;
  steadfast?: boolean;
  move: Feet;
  morale: number;
}

export type Armour = "Unarmoured" | "Light" | "Medium" | "Heavy";

export interface Unit {
  name: string;
  shortName?: string;
  type: UnitType;
  missile?: boolean;
  flankCount: number;
  damage: number;
  moved: Feet;
  status: MoraleStatus;
  ready: boolean;
  side: SideId;
}

export type MoraleStatus = "Normal" | "Shaken" | "Rout";

/**
 * Axis-aligned rectangular region that restricts where a side may
 * drop units during the Placement phase.  The region covers columns
 * [x, x+width) and rows [y, y+height).
 */
export interface DeploymentZone {
  x: Cells;
  y: Cells;
  width: Cells;
  height: Cells;
}

/** A unit-type template stored in the roster (stats only, no instance name). */
export interface UnitDefinition {
  id: UnitDefinitionId;
  type: UnitType;
}

export interface Terrain {
  type: TerrainType;
  elevation: number;
}

export type TerrainType = "Open" | "Woods" | "Marsh";

export interface OptionalRules {
  /** Mounted units get +1 attack when they moved this turn. Default: true. */
  cavalryCharge?: boolean;
  /** Missile-armed units get -1 attack when fighting in melee. Default: true. */
  archerMeleePenalty?: boolean;
  /** Units get +1 attack against flanked enemies. Default: true. */
  flanking?: boolean;
  /** Units cannot freely disengage from melee. Default: false. */
  meleeEngagement?: boolean;
}

export interface KillChain<P> {
  cellSize: Feet;
  getDistance(a: Unit, b: Unit): Feet;
  getPosition(u: Unit): P;
  getTerrainAt(p: P): Terrain;
  getTerrain(u: Unit): Terrain;
  getUnitAt(p: P): Unit | undefined;
}
