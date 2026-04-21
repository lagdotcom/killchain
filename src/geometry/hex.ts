import type { Cells, Pixels, Radians } from "../flavours.js";
import { type XY } from "../killchain/EuclideanEngine.js";
import { enumerate } from "../tools.js";
import type { Layout } from "./layout.js";
import { Point } from "./point.js";

export class Hex {
  constructor(
    public q: Cells,
    public r: Cells,
  ) {}

  get id() {
    return `${this.q}_${this.r}`;
  }

  get s(): Cells {
    return 0 - this.q - this.r;
  }

  add(o: Hex) {
    return new Hex(this.q + o.q, this.r + o.r);
  }

  subtract(o: Hex) {
    return new Hex(this.q - o.q, this.r - o.r);
  }

  length() {
    return Math.floor(
      (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2,
    );
  }

  distance(o: Hex) {
    return this.subtract(o).length();
  }

  round() {
    let q = Math.round(this.q);
    let r = Math.round(this.r);
    const s = Math.round(this.s);
    const q_diff = Math.abs(q - this.q);
    const r_diff = Math.abs(r - this.r);
    const s_diff = Math.abs(s - this.s);
    if (q_diff > r_diff && q_diff > s_diff) {
      q = -r - s;
    } else if (r_diff > s_diff) {
      r = -q - s;
    }
    return new Hex(q, r);
  }

  toOddQ(): XY {
    const parity = this.q & 1;
    const col = this.q;
    const row = this.r + (this.q - parity) / 2;
    return { x: col, y: row };
  }
}

export const hex = (q: Cells, r: Cells) => new Hex(q, r);

export class Orientation {
  constructor(
    public f0: number,
    public f1: number,
    public f2: number,
    public f3: number,
    public b0: number,
    public b1: number,
    public b2: number,
    public b3: number,
    public startAngle: Radians,
  ) {}
}

export const pointyOrientation = new Orientation(
  Math.sqrt(3.0),
  Math.sqrt(3.0) / 2.0,
  0.0,
  3.0 / 2.0,
  Math.sqrt(3.0) / 3.0,
  -1.0 / 3.0,
  0.0,
  2.0 / 3.0,
  0.5,
);

export const flatOrientation = new Orientation(
  3.0 / 2.0,
  0.0,
  Math.sqrt(3.0) / 2.0,
  Math.sqrt(3.0),
  2.0 / 3.0,
  0.0,
  -1.0 / 3.0,
  Math.sqrt(3.0) / 3.0,
  0.0,
);

const twoPi = Math.PI * 2;
const sixthOfCircle = twoPi / 6;

export class HexLayout implements Layout<Hex> {
  constructor(
    public orientation: Orientation,
    public size: XY<Pixels>,
    public origin: XY<Pixels>,
  ) {}

  toPixel(h: Hex) {
    const o = this.orientation;
    const x = (o.f0 * h.q + o.f1 * h.r) * this.size.x;
    const y = (o.f2 * h.q + o.f3 * h.r) * this.size.y;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
    return new Point<Pixels>(x + this.origin.x, y + this.origin.y);
  }

  toCell(p: XY<Pixels>) {
    const o = this.orientation;
    const x = (p.x - this.origin.x) / this.size.x;
    const y = (p.y - this.origin.y) / this.size.y;
    const q = o.b0 * x + o.b1 * y;
    const r = o.b2 * x + o.b3 * y;
    return new Hex(q, r).round();
  }

  getCornerOffset(corner: number) {
    const angle = sixthOfCircle * (this.orientation.startAngle + corner);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
    return new Point<Pixels>(
      this.size.x * Math.cos(angle),
      this.size.y * Math.sin(angle),
    );
  }

  getCornerOffsets() {
    return enumerate(6).map((n) => this.getCornerOffset(n));
  }

  getPolygonCorners(h: Hex) {
    const centre = this.toPixel(h);
    return this.getCornerOffsets().map((offset) => centre.add(offset));
  }
}
