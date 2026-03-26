import type { SideId } from "../flavours.js";

export interface UnitType {
  name: string;
  hits: number;
  armour: Armour;
  mounted?: boolean;
  move: number;
  morale: number;
}

export type Armour = "Unarmoured" | "Light" | "Medium" | "Heavy";

export interface Unit {
  name: string;
  type: UnitType;
  missile?: boolean;
  damage: number;
  moved: number;
  status: MoraleStatus;
  acted: boolean;
  side: SideId;
}

export type MoraleStatus = "Normal" | "Shaken" | "Rout";

export interface Terrain {
  type: TerrainType;
  elevation: number;
}

export type TerrainType = "Open" | "Woods" | "Marsh";

export interface KillChain<P> {
  getDistance(a: Unit, b: Unit): number;
  getPosition(u: Unit): P;
  getTerrainAt(p: P): Terrain;
  getTerrain(u: Unit): Terrain;
  getUnitAt(p: P): Unit | undefined;
}
