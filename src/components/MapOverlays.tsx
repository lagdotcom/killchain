import { useMemo } from "react";

import type { Cells } from "../flavours.js";
import { useMapTool } from "../hooks/useMapTool.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import type { DeploymentZone } from "../killchain/types.js";

export interface ZoneInfo {
  key: string;
  colour: string;
  zone: DeploymentZone;
}

export interface ZoneOverlayProps {
  zone: ZoneInfo;
}

export function ZoneOverlay({ colour, zone }: ZoneInfo) {
  const tool = useMapTool();

  return useMemo(() => {
    const ey = zone.y + zone.height;
    const ex = zone.x + zone.width;

    const cells = [];

    for (let y = zone.y; y < ey; y++)
      for (let x = zone.x; x < ex; x++)
        cells.push(
          tool.getPolygon(x, y, true, {
            key: xyId(x, y),
            className: "overlay",
            fill: colour,
            stroke: colour,
          }),
        );

    return cells;
  }, [colour, tool, zone.height, zone.width, zone.x, zone.y]);
}

export function CellHighlight({
  x,
  y,
  stroke = "white",
}: {
  x: Cells;
  y: Cells;
  stroke?: string;
}) {
  const tool = useMapTool();
  return tool.getPolygon(x, y, true, {
    className: "highlight",
    fill: "none",
    stroke,
    strokeWidth: 2,
    pointerEvents: "none",
  });
}
