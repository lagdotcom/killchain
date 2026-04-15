import type { Cells, Feet } from "../flavours.js";
import { cellSize } from "../ui.js";

export type TintReason = "short" | "medium" | "long" | "reachable" | "deployable";

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
  deployable: "#08f",
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
  logHoverCell?: { x: Cells; y: Cells } | undefined;
}

export function GridOverlay({ tints, logHoverCell }: GridOverlayProps) {
  return (
    <g>
      {tints.map((tint) => (
        <OverlayTint key={tint.id} {...tint} />
      ))}
      {logHoverCell && (
        <rect
          className="logHoverHighlight"
          x={logHoverCell.x * cellSize}
          y={logHoverCell.y * cellSize}
          width={cellSize}
          height={cellSize}
          fill="none"
          stroke="#ffd"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
