import type { Cells, Side } from "../flavours.js";
import type { Terrain } from "../killchain/types.js";
import { cellSize, shadowSize, terrainColours } from "../styles.js";

export interface TerrainCellProps {
  x: Cells;
  y: Cells;
  terrain: Terrain;
  north: Terrain;
  east: Terrain;
  south: Terrain;
  west: Terrain;
  onDrop:
    | ((x: Cells, y: Cells, unitId: string, sideId: Side) => void)
    | undefined;
}

function TerrainCell({
  x,
  y,
  terrain,
  north,
  east,
  south,
  west,
  onDrop,
}: TerrainCellProps) {
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

      {terrain.type === "Woods" && (
        <>
          <path className="woodsIcon" d="M20,55 v-15 a10 10 360 1 1 0.1,0" />
          <path className="woodsIcon" d="M45,45 v-15 a10 10 360 1 1 0.1,0" />
        </>
      )}

      {terrain.type === "Marsh" && (
        <>
          <path className="marshIcon" d="M32,32 m-15,9 l-15,-12" />
          <path className="marshIcon" d="M32,32 m-9,2 l-11,-17" />
          <path className="marshIcon" d="M32,32 l0,-22" />
          <path className="marshIcon" d="M32,32 m9,2 l11,-17" />
          <path className="marshIcon" d="M32,32 m15,9 l15,-12" />
        </>
      )}

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

export default TerrainCell;
