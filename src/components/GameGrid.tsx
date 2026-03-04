import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import type { Cells } from "../flavours.js";
import { usePanZoom } from "../hooks/usePanZoom.js";
import { selectAllUnits, selectTerrainEntities } from "../state/selectors.js";
import type { TerrainState } from "../state/terrain.js";
import { cellSize, mapHeight, mapWidth } from "../styles.js";
import { enumerate } from "../tools.js";
import TerrainCell from "./TerrainCell.js";
import UnitToken from "./UnitToken.js";

function getTerrainCells(
  width: Cells,
  height: Cells,
  getTerrain: (x: Cells, y: Cells, e: number) => TerrainState,
) {
  return enumerate(height)
    .flatMap((y) => enumerate(width).map((x) => getTerrain(x, y, -1)))
    .map((data) => (
      <TerrainCell
        key={data.id}
        x={data.x}
        y={data.y}
        terrain={data}
        north={getTerrain(data.x, data.y - 1, data.elevation)}
        south={getTerrain(data.x, data.y + 1, data.elevation)}
        east={getTerrain(data.x + 1, data.y, data.elevation)}
        west={getTerrain(data.x - 1, data.y, data.elevation)}
      />
    ));
}

function GameGrid() {
  const units = useSelector(selectAllUnits);
  const terrain = useSelector(selectTerrainEntities);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [initialized, setInitialized] = useState(false);

  const { goto } = usePanZoom(svgRef, gRef);

  const getTerrain = useCallback(
    (x: Cells, y: Cells, defaultElevation: number = 0): TerrainState =>
      terrain[`${x},${y}`] ?? {
        id: `${x},${y}`,
        x,
        y,
        type: "Open",
        elevation: defaultElevation,
      },
    [terrain],
  );

  const terrainCells = useMemo(
    () => getTerrainCells(mapWidth, mapHeight, getTerrain),
    [getTerrain],
  );

  // centre map on mount
  useEffect(() => {
    if (initialized) return;
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const mapW = mapWidth * cellSize;
      const mapH = mapHeight * cellSize;
      const offsetX = (rect.width - mapW) / 2;
      const offsetY = (rect.height - mapH) / 2;
      goto(offsetX, offsetY);
      setInitialized(true);
    }
  }, [initialized]);

  return (
    <div className="container">
      <svg ref={svgRef} width="100%" height="100%" className="map">
        <g ref={gRef}>
          {initialized && terrainCells}
          {initialized &&
            units.map((unit) => (
              <UnitToken key={unit.id} unit={unit} cellSize={cellSize} />
            ))}
        </g>
      </svg>
    </div>
  );
}

export default GameGrid;
