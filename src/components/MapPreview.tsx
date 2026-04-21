import { useMemo } from "react";

import { MapTool } from "../geometry/tool.js";
import type { MapEntity } from "../state/maps.js";
import { terrainColours } from "../ui.js";

export function MapPreview({ preview }: { preview: MapEntity }) {
  const tool = useMemo(
    () => new MapTool(preview.layout, preview.width, preview.height, 1),
    [preview.height, preview.layout, preview.width],
  );

  return (
    <svg
      viewBox={tool.viewBox}
      width={preview.width * 8}
      height={preview.height * 8}
      className="map-preview-svg"
      style={{ imageRendering: "pixelated" }}
    >
      <g>
        {Object.values(preview.cells.entities).map((cell) =>
          tool.getPolygon(cell.x, cell.y, true, {
            key: cell.id,
            fill: terrainColours[cell.type],
          }),
        )}
      </g>
    </svg>
  );
}
