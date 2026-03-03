import type { MarkOptional } from "ts-essentials";

import type { KillChain, Terrain, TerrainType, Unit } from "./types.js";

export type XY = { x: number; y: number };

export class EuclideanEngine implements KillChain<XY> {
  private positionCache: Map<string, XY>;
  public positions: Map<Unit, XY>;
  public terrain: Map<XY, Terrain>;
  public units: Set<Unit>;

  constructor() {
    this.positionCache = new Map();
    this.positions = new Map();
    this.terrain = new Map();
    this.units = new Set();
  }

  addUnit(
    template: MarkOptional<
      Unit,
      "name" | "damage" | "moved" | "status" | "acted"
    >,
    x: number,
    y: number,
  ) {
    const u: Unit = {
      name: "unit",
      damage: 0,
      moved: 0,
      status: "Normal",
      acted: false,
      ...template,
    };

    this.units.add(u);
    this.positions.set(u, this.at(x, y));
    return u;
  }

  at(x: number, y: number): XY {
    const s = `${x},${y}`;
    const p = this.positionCache.get(s);
    if (!p) {
      const pNew: XY = { x, y };
      this.positionCache.set(s, pNew);
      return pNew;
    }
    return p;
  }

  getDistance(a: Unit, b: Unit) {
    const ap = this.getPosition(a);
    const bp = this.getPosition(b);

    return Math.abs(ap.x - bp.x) + Math.abs(ap.y - bp.y);
  }

  getPosition(u: Unit) {
    const p = this.positions.get(u);
    if (p === undefined) throw new Error(`Invalid unit: ${u.name}`);
    return p;
  }

  getTerrain(u: Unit) {
    return this.getTerrainAt(this.getPosition(u));
  }

  getTerrainAt(p: XY): Terrain {
    return this.terrain.get(p) ?? { type: "Open", elevation: 0 };
  }

  setTerrain(x: number, y: number, type: TerrainType, elevation = 0) {
    this.terrain.set(this.at(x, y), { type, elevation });
  }
}
