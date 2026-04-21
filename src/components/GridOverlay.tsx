import type { Feet } from "../flavours.js";
import { MapTool } from "../geometry/tool.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import type { MapLayout } from "../state/maps.js";
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

export interface OverlayTintProps extends Tint {
  layout: MapLayout;
}

function OverlayTint({ x, y, layout, reason }: OverlayTintProps) {
  const tool = new MapTool(layout);
  return tool.getPolygon(x, y, true, {
    className: "tint",
    fill: reasonColours[reason],
  });
}

interface GridOverlayProps {
  layout: MapLayout;
  tints: Tint[];
  logHoverCell?: XY | undefined;
}

export function GridOverlay({ layout, tints, logHoverCell }: GridOverlayProps) {
  return (
    <g>
      {tints.map((tint) => (
        <OverlayTint key={tint.id} layout={layout} {...tint} />
      ))}
      {logHoverCell && (
        <CellHighlight
          layout={layout}
          x={logHoverCell.x}
          y={logHoverCell.y}
          stroke="#ffd"
        />
      )}
    </g>
  );
}
