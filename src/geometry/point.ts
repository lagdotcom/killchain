import type { XY } from "../killchain/EuclideanEngine.js";

export class Point<T extends number> implements XY<T> {
  constructor(
    public x: T,
    public y: T,
  ) {}

  add(o: XY<T>) {
    return new Point((this.x + o.x) as T, (this.y + o.y) as T);
  }
}
