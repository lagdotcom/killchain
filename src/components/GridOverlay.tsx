import type { Feet } from "../flavours.js";
import { useMapTool } from "../hooks/useMapTool.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import { CellHighlight } from "./MapOverlays.js";

export type TintReason = "short" | "medium" | "long" | "reachable";

export interface Tint extends XY {
  id: string;
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
  const tool = useMapTool();
  return tool.getPolygon(x, y, true, {
    className: "tint",
    fill: reasonColours[reason],
  });
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
        <CellHighlight x={logHoverCell.x} y={logHoverCell.y} stroke="#ffd" />
      )}
    </g>
  );
}
