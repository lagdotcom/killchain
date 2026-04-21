import type { Pixels } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";

export interface Layout<T> {
  getCornerOffsets(): XY<Pixels>[];
  getPolygonCorners(cell: T): XY<Pixels>[];

  toPixel(cell: T): XY<Pixels>;
  toCell(p: XY<Pixels>): T;
}
