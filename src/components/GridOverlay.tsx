import type { Cells } from "../flavours.js";
import { cellSize } from "../ui.js";

export type TintReason = "short" | "medium" | "long" | "reachable";

export interface Tint {
  id: string;
  x: Cells;
  y: Cells;
  cost: number;
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

export function GridOverlay({ tints }: { tints: Tint[] }) {
  return (
    <g>
      {tints.map((tint) => (
        <OverlayTint key={tint.id} {...tint} />
      ))}
    </g>
  );
}
