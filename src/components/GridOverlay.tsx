import type { Cells, Feet } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import { cellSize } from "../ui.js";
import { CellHighlight } from "./MapOverlays.js";

export type TintReason = "short" | "medium" | "long" | "reachable";

export interface Tint {
  id: string;
  x: Cells;
  y: Cells;
  cost: Feet;
  reason: TintReason;
}

const reasonColours: Record<TintReason, string> = {
  short: "#0f0",
  medium: "#ff0",
  long: "#f00",
  reachable: "#fff",
};

function OverlayTint({ x, y, reason }: Tint) {
  const px = x * cellSize;
  const py = y * cellSize;

  return (
    <rect
      className="tint"
      x={px}
      y={py}
      width={cellSize}
      height={cellSize}
      fill={reasonColours[reason]}
    />
  );
}

interface GridOverlayProps {
  tints: Tint[];
  logHoverCell?: XY | undefined;
}

export function GridOverlay({ tints, logHoverCell }: GridOverlayProps) {
  return (
    <g>
      {tints.map((tint) => (
        <OverlayTint key={tint.id} {...tint} />
      ))}
      {logHoverCell && (
        <CellHighlight
          x={logHoverCell.x}
          y={logHoverCell.y}
          cs={cellSize}
          stroke="#ffd"
        />
      )}
    </g>
  );
}
