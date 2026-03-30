import type { MarkOptional } from "ts-essentials";

import type { Cells } from "../flavours.js";
import { manhattanDistance } from "../tools.js";
import type { KillChain, Terrain, TerrainType, Unit } from "./types.js";

export type XY<T extends number = Cells> = { x: T; y: T };
export const xyId = (x: Cells, y: Cells) => `${x},${y}`;

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
      "name" | "damage" | "moved" | "status" | "ready" | "flankCount"
    >,
    x: Cells,
    y: Cells,
  ) {
    const u: Unit = {
      name: "unit",
      damage: 0,
      moved: 0,
      flankCount: 0,
      status: "Normal",
      ready: false,
      ...template,
    };

    this.units.add(u);
    this.positions.set(u, this.at(x, y));
    return u;
  }

  at(x: Cells, y: Cells): XY {
    const s = xyId(x, y);
    const p = this.positionCache.get(s);
    if (!p) {
      const pNew: XY = { x, y };
      this.positionCache.set(s, pNew);
      return pNew;
    }
    return p;
  }

  getDistance(a: Unit, b: Unit) {
    return manhattanDistance(this.getPosition(a), this.getPosition(b));
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

  setTerrain(x: Cells, y: Cells, type: TerrainType, elevation = 0) {
    this.terrain.set(this.at(x, y), { type, elevation });
  }

  getUnitAt(p: XY): Unit | undefined {
    for (const [unit, at] of this.positions.entries()) {
      if (at.x === p.x && at.y === p.y) return unit;
    }
  }
}
