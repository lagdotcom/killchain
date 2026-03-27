import type { TerrainId, UnitId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import type { KillChain, Unit } from "./killchain/types.js";
import type { TerrainEntity } from "./state/terrain.js";
import type { UnitEntity } from "./state/units.js";
import { manhattanDistance } from "./tools.js";

export class KillChainEngine implements KillChain<TerrainId> {
  constructor(
    private terrain: Record<TerrainId, TerrainEntity>,
    private units: Record<UnitId, UnitEntity>,
  ) {}

  getXY(u: UnitEntity) {
    return { x: u.x, y: u.y };
  }

  getDistance(a: Unit, b: Unit) {
    return manhattanDistance(
      this.getXY(a as UnitEntity),
      this.getXY(b as UnitEntity),
    );
  }

  getPosition(u: Unit) {
    const pos = this.getXY(u as UnitEntity);
    return xyId(pos.x, pos.y);
  }

  getTerrainAt(p: TerrainId) {
    return this.terrain[p] ?? { type: "Open", elevation: 0 };
  }

  getTerrain(u: Unit) {
    return this.getTerrainAt(this.getPosition(u));
  }

  getUnitAt(p: TerrainId): Unit | undefined {
    for (const unit of Object.values(this.units)) {
      if (xyId(unit.x, unit.y) === p) return unit;
    }
  }
}
