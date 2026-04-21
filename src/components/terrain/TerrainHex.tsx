import { useMemo } from "react";

import type { Cells } from "../../flavours.js";
import { MapTool } from "../../geometry/tool.js";
import type { Terrain } from "../../killchain/types.js";
import { hexAdjacencyOddQ } from "../../pathfinding.js";
import type { TerrainEntity } from "../../state/terrain.js";
import { enumerate } from "../../tools.js";
import { cellSize, hexCellSize, shadowSize, terrainColours } from "../../ui.js";
import type { TerrainCellProps } from "./common.js";
import { getTerrainIcon } from "./icons.js";

interface TerrainHexProps extends TerrainCellProps {
  clipPathId: string;
  adjacent: Terrain[];
  tool: MapTool;
}

const halfCellOffset = `translate(-${cellSize / 2},-${cellSize / 2})`;

export function TerrainHex({
  x,
  y,
  terrain,
  clipPathId,
  adjacent,
  tool,
  onClick,
  onDrop,
}: TerrainHexProps) {
  const hex = tool.convertToHex({ x, y });
  const { x: px, y: py } = tool.hexLayout.toPixel(hex);

  const elevationOverlay =
    terrain.elevation > 0
      ? `rgba(255, 255, 255, ${terrain.elevation * 0.05})`
      : null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const unitId = e.dataTransfer.getData("unitId");
    const sideId = Number(e.dataTransfer.getData("sideId"));
    if (unitId && !isNaN(sideId)) onDrop?.(x, y, unitId, sideId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const getElevationShadow = (i: number) => {
    const a = tool.hexLayout.getCornerOffset(i - 1);
    const b = tool.hexLayout.getCornerOffset(i);

    return (
      <line
        key={`sh_${i}`}
        className="shadow"
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeWidth={shadowSize * 2}
        clipPath={`url(#${clipPathId})`}
      />
    );
  };

  const icon = useMemo(() => {
    const element = getTerrainIcon(terrain.type);
    if (element) return <g transform={halfCellOffset}>{element}</g>;
  }, [terrain.type]);

  return (
    <g
      transform={`translate(${px}, ${py})`}
      className="cell"
      onClick={() => onClick?.(x, y)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {tool.getPolygon(terrain.x, terrain.y, false, {
        className: "fill",
        fill: terrainColours[terrain.type],
      })}

      {icon}

      {adjacent.map(
        (other, i) =>
          other.elevation > terrain.elevation && getElevationShadow(i),
      )}

      <text className="elevation" x={hexCellSize / 2} y={hexCellSize * 0.8}>
        {terrain.elevation}
      </text>

      {elevationOverlay &&
        tool.getPolygon(terrain.x, terrain.y, false, {
          className: "elevationOverlay",
          fill: elevationOverlay,
        })}
    </g>
  );
}

export function getTerrainHexes(
  width: Cells,
  height: Cells,
  clipPathId: string,
  getTerrain: (x: Cells, y: Cells, e: number) => TerrainEntity,
  onClick?: TerrainHexProps["onClick"],
  onDrop?: TerrainHexProps["onDrop"],
) {
  const tool = new MapTool("hex", width, height);

  return enumerate(height)
    .flatMap((y) => enumerate(width).map((x) => getTerrain(x, y, -1)))
    .map((data) => (
      <TerrainHex
        key={data.id}
        x={data.x}
        y={data.y}
        clipPathId={clipPathId}
        terrain={data}
        tool={tool}
        adjacent={hexAdjacencyOddQ(data.x, data.y).map((xy) =>
          getTerrain(xy.x, xy.y, data.elevation),
        )}
        onClick={onClick}
        onDrop={onDrop}
      />
    ));
}
