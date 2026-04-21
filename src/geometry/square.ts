import type { Cells, Pixels } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import type { Layout } from "./layout.js";
import { Point } from "./point.js";

export class Square {
  constructor(
    public x: Cells,
    public y: Cells,
  ) {}

  get id() {
    return `${this.x},${this.y}`;
  }

  round() {
    return new Square(Math.floor(this.x), Math.floor(this.y));
  }
}

export class SquareLayout implements Layout<Square> {
  private right: XY<Pixels>;
  private down: XY<Pixels>;

  constructor(
    public size: XY<Pixels>,
    public origin: XY<Pixels>,
  ) {
    this.right = { x: size.x, y: 0 };
    this.down = { x: 0, y: size.y };
  }

  toPixel(s: Square) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
    return new Point<Pixels>(
      this.origin.x + this.size.x * s.x,
      this.origin.y + this.size.y * s.y,
    );
  }

  toCell(p: XY<Pixels>) {
    return new Square(
      (p.x - this.origin.x) / this.size.x,
      (p.y - this.origin.y) / this.size.y,
    ).round();
  }

  getCornerOffsets(): XY<Pixels>[] {
    return [{ x: 0, y: 0 }, this.right, this.size, this.down];
  }

  getPolygonCorners(cell: Square): XY<Pixels>[] {
    const topLeft = this.toPixel(cell);
    return this.getCornerOffsets().map((offset) => topLeft.add(offset));
  }
}
