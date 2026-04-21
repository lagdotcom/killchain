import type { Cells } from "../../flavours.js";
import type { Terrain } from "../../killchain/types.js";
import type { TerrainEntity } from "../../state/terrain.js";
import { enumerate } from "../../tools.js";
import { cellSize, shadowSize, terrainColours } from "../../ui.js";
import type { TerrainCellProps } from "./common.js";
import { getTerrainIcon } from "./icons.js";

interface TerrainSquareProps extends TerrainCellProps {
  north: Terrain;
  east: Terrain;
  south: Terrain;
  west: Terrain;
}

function TerrainSquare({
  x,
  y,
  terrain,
  north,
  east,
  south,
  west,
  onClick,
  onDrop,
}: TerrainSquareProps) {
  const px = x * cellSize;
  const py = y * cellSize;
  const fill = terrainColours[terrain.type];

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

  return (
    <g
      transform={`translate(${px}, ${py})`}
      className="cell"
      onClick={() => onClick?.(x, y)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <rect
        className="fill"
        x={0}
        y={0}
        width={cellSize}
        height={cellSize}
        fill={fill}
      />

      {getTerrainIcon(terrain.type)}

      {north.elevation > terrain.elevation && (
        <rect
          className="shadow"
          x={0}
          y={0}
          width={cellSize}
          height={shadowSize}
        />
      )}
      {east.elevation > terrain.elevation && (
        <rect
          className="shadow"
          x={cellSize - shadowSize}
          y={0}
          width={shadowSize}
          height={cellSize}
        />
      )}
      {south.elevation > terrain.elevation && (
        <rect
          className="shadow"
          x={0}
          y={cellSize - shadowSize}
          width={cellSize}
          height={shadowSize}
        />
      )}
      {west.elevation > terrain.elevation && (
        <rect
          className="shadow"
          x={0}
          y={0}
          width={shadowSize}
          height={cellSize}
        />
      )}

      <text className="elevation" x={cellSize - 5} y={cellSize - 5}>
        {terrain.elevation}
      </text>

      {elevationOverlay && (
        <rect
          x={0}
          y={0}
          width={cellSize}
          height={cellSize}
          fill={elevationOverlay}
        />
      )}
    </g>
  );
}

export default TerrainSquare;

export function getTerrainSquares(
  width: Cells,
  height: Cells,
  getTerrain: (x: Cells, y: Cells, e: number) => TerrainEntity,
  onClick?: TerrainSquareProps["onClick"],
  onDrop?: TerrainSquareProps["onDrop"],
) {
  return enumerate(height)
    .flatMap((y) => enumerate(width).map((x) => getTerrain(x, y, -1)))
    .map((data) => (
      <TerrainSquare
        key={data.id}
        x={data.x}
        y={data.y}
        terrain={data}
        north={getTerrain(data.x, data.y - 1, data.elevation)}
        south={getTerrain(data.x, data.y + 1, data.elevation)}
        east={getTerrain(data.x + 1, data.y, data.elevation)}
        west={getTerrain(data.x - 1, data.y, data.elevation)}
        onClick={onClick}
        onDrop={onDrop}
      />
    ));
}
