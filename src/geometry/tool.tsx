import type { Cells, Pixels } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import type { MapLayout } from "../state/maps.js";
import { cellSize as squareCellSize, hexCellSize } from "../ui.js";
import { flatOrientation, Hex, HexLayout } from "./hex.js";

type RectProps = React.SVGProps<SVGRectElement>;
type PolygonProps = React.SVGProps<SVGPolygonElement>;
type CellProps = RectProps & PolygonProps;

export class MapTool {
  offset: XY<Pixels>;
  size: XY<Pixels>;

  constructor(
    public layout: MapLayout,
    public width: Cells = 0,
    public height: Cells = 0,
    public cellSize: Pixels = layout === "square"
      ? squareCellSize
      : hexCellSize,
  ) {
    this.offset = { x: 0, y: 0 };
    this.size = { x: cellSize, y: cellSize };
  }

  get hexLayout() {
    return new HexLayout(flatOrientation, this.size, this.offset);
  }

  get viewBox() {
    if (this.layout === "square") return `0 0 ${this.width} ${this.height}`;

    return `-0.5 -${flatOrientation.f2} ${this.width * 1.5} ${this.height * flatOrientation.f3 + 1}`;
  }

  convertToHex({ x, y }: XY) {
    const q = x;
    const r = y - (q >> 1);
    return new Hex(q, r);
  }

  getPolygon(x: Cells, y: Cells, absolute: boolean, props: CellProps = {}) {
    const { key, ...rest } = props;

    if (this.layout === "square")
      return (
        <rect
          x={absolute ? x * this.cellSize : 0}
          y={absolute ? y * this.cellSize : 0}
          width={this.cellSize}
          height={this.cellSize}
          key={key}
          {...rest}
        />
      );

    const hex = this.convertToHex({ x, y });
    const corners = absolute
      ? this.hexLayout.getPolygonCorners(hex)
      : this.hexLayout.getCornerOffsets();

    return (
      <polygon
        points={corners.map(({ x, y }) => `${x},${y}`).join(" ")}
        key={key}
        {...rest}
      />
    );
  }

  getCentre(x: Cells, y: Cells): XY<Pixels> {
    if (this.layout === "square") {
      const lx = this.cellSize * x;
      const ty = this.cellSize * y;
      return { x: lx + this.cellSize / 2, y: ty + this.cellSize / 2 };
    }

    const hex = this.convertToHex({ x, y });
    return this.hexLayout.toPixel(hex);
  }
}
