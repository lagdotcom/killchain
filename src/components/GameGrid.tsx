import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { Cells } from "../flavours.js";
import { usePanZoom } from "../hooks/usePanZoom.js";
import { placeUnit } from "../state/battle.js";
import { selectAllUnits, selectTerrainEntities } from "../state/selectors.js";
import type { TerrainState } from "../state/terrain.js";
import { updateUnit } from "../state/units.js";
import { cellSize, mapHeight, mapWidth } from "../styles.js";
import { enumerate } from "../tools.js";
import TerrainCell from "./TerrainCell.js";
import UnitToken from "./UnitToken.js";

function getTerrainCells(
  width: Cells,
  height: Cells,
  getTerrain: (x: Cells, y: Cells, e: number) => TerrainState,
  onDrop: (x: Cells, y: Cells, unitId: string) => void,
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
        onDrop={onDrop}
      />
    ));
}

function GameGrid() {
  const dispatch = useDispatch();
  const units = useSelector(selectAllUnits);
  const terrain = useSelector(selectTerrainEntities);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const { goto } = usePanZoom(svgRef, gRef);

  const placedUnits = units.filter((u) => u.x >= 0 && u.y >= 0);

  const handleDrop = useCallback(
    (x: Cells, y: Cells, id: string) => {
      dispatch(updateUnit({ id, changes: { x, y } }));
      dispatch(placeUnit(id));
    },
    [dispatch],
  );

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
    () => getTerrainCells(mapWidth, mapHeight, getTerrain, handleDrop),
    [getTerrain, handleDrop],
  );

  // centre map on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const mapW = mapWidth * cellSize;
      const mapH = mapHeight * cellSize;
      const offsetX = (rect.width - mapW) / 2;
      const offsetY = (rect.height - mapH) / 2;
      goto(offsetX, offsetY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg ref={svgRef} width="100%" height="100%" className="map">
      <g ref={gRef}>
        {terrainCells}
        {placedUnits.map((unit) => (
          <UnitToken key={unit.id} unit={unit} cellSize={cellSize} />
        ))}
      </g>
    </svg>
  );
}

export default GameGrid;
