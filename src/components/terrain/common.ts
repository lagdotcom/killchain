import type { Cells, SideId, UnitId } from "../../flavours.js";
import type { XY } from "../../killchain/EuclideanEngine.js";
import type { TerrainEntity } from "../../state/terrain.js";

export interface TerrainCellProps extends XY {
  terrain: TerrainEntity;
  onClick: ((x: Cells, y: Cells) => void) | undefined;
  onDrop:
    | ((x: Cells, y: Cells, unitId: UnitId, sideId: SideId) => void)
    | undefined;
}
