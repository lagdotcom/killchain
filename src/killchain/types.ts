import type { Feet, SideId, UnitDefinitionId } from "../flavours.js";

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

/** A side-agnostic unit template stored in the roster. */
export interface UnitDefinition {
  id: UnitDefinitionId;
  name: string;
  shortName?: string;
  type: UnitType;
  missile?: boolean;
}

export interface Terrain {
  type: TerrainType;
  elevation: number;
}

export type TerrainType = "Open" | "Woods" | "Marsh";

export interface KillChain<P> {
  cellSize: Feet;
  getDistance(a: Unit, b: Unit): Feet;
  getPosition(u: Unit): P;
  getTerrainAt(p: P): Terrain;
  getTerrain(u: Unit): Terrain;
  getUnitAt(p: P): Unit | undefined;
}
