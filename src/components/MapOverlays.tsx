import { useMemo } from "react";

import type { Cells } from "../flavours.js";
import { MapTool } from "../geometry/tool.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import type { DeploymentZone } from "../killchain/types.js";
import type { MapLayout } from "../state/maps.js";

export interface ZoneInfo {
  key: string;
  colour: string;
  zone: DeploymentZone;
}

export interface ZoneOverlayProps {
  layout: MapLayout;
  zone: ZoneInfo;
}

export function ZoneOverlay({ layout, zone }: ZoneOverlayProps) {
  return useMemo(() => {
    const tool = new MapTool(layout);
    const ey = zone.zone.y + zone.zone.height;
    const ex = zone.zone.x + zone.zone.width;

    const cells = [];

    for (let y = zone.zone.y; y < ey; y++)
      for (let x = zone.zone.x; x < ex; x++)
        cells.push(
          tool.getPolygon(x, y, true, {
            key: xyId(x, y),
            className: "overlay",
            fill: zone.colour,
            stroke: zone.colour,
          }),
        );

    return cells;
  }, [
    layout,
    zone.colour,
    zone.zone.height,
    zone.zone.width,
    zone.zone.x,
    zone.zone.y,
  ]);
}

export function CellHighlight({
  layout,
  x,
  y,
  stroke = "white",
}: {
  layout: MapLayout;
  x: Cells;
  y: Cells;
  stroke?: string;
}) {
  return new MapTool(layout).getPolygon(x, y, true, {
    className: "highlight",
    fill: "none",
    stroke,
    strokeWidth: 2,
    pointerEvents: "none",
  });
}
