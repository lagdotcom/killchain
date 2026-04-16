import { useState } from "react";

import type { Cells } from "../flavours.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import type { DeploymentZone } from "../killchain/types.js";
import type { MapEntity } from "../state/maps.js";
import type { TerrainEntity } from "../state/terrain.js";
import { cellSize } from "../ui.js";
import { CellHighlight, type ZoneInfo, ZoneOverlay } from "./MapOverlays.js";
import { getTerrainCells } from "./TerrainCell.js";
import { UnitTokenBase } from "./UnitToken.js";
export type { ZoneInfo } from "./MapOverlays.js";

export interface PlacedUnit {
  sideIdx: number;
  unitIdx: number;
  colour: string;
  label: string;
  x: Cells;
  y: Cells;
}

interface ScenarioMapEditorProps {
  map: MapEntity;
  placedUnits: PlacedUnit[];
  zones: ZoneInfo[];
  /** Side index currently in zone-define mode; -1 = none */
  zoneSideIdx: number;
  onPlace: (x: Cells, y: Cells, sideIdx: number, unitIdx: number) => void;
  onUnplace: (sideIdx: number, unitIdx: number) => void;
  onZoneDefined: (zone: DeploymentZone) => void;
}

interface DraftZone {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

function computeZone(draft: DraftZone): DeploymentZone {
  const x = Math.min(draft.ax, draft.bx) as Cells;
  const y = Math.min(draft.ay, draft.by) as Cells;
  const width = (Math.abs(draft.bx - draft.ax) + 1) as Cells;
  const height = (Math.abs(draft.by - draft.ay) + 1) as Cells;
  return { x, y, width, height };
}

export function ScenarioMapEditor({
  map,
  placedUnits,
  zones,
  zoneSideIdx,
  onPlace,
  onUnplace,
  onZoneDefined,
}: ScenarioMapEditorProps) {
  const [dragOverCell, setDragOverCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [draftZone, setDraftZone] = useState<DraftZone | null>(null);

  const svgWidth = map.width * cellSize;
  const svgHeight = map.height * cellSize;

  function getTerrain(
    x: Cells,
    y: Cells,
    defaultElevation: number = 0,
  ): TerrainEntity {
    return (
      map.cells.entities[xyId(x, y)] ?? {
        id: xyId(x, y),
        x,
        y,
        type: "Open",
        elevation: defaultElevation,
      }
    );
  }

  function getCellFromEvent(e: React.MouseEvent<SVGSVGElement>): {
    x: number;
    y: number;
  } {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / cellSize),
      y: Math.floor((e.clientY - rect.top) / cellSize),
    };
  }

  // ---- Drag-and-drop --------------------------------------------------------

  function handleDragOver(e: React.DragEvent<SVGSVGElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(getCellFromEvent(e));
  }

  function handleDragLeave() {
    setDragOverCell(null);
  }

  function handleDrop(e: React.DragEvent<SVGSVGElement>) {
    e.preventDefault();
    setDragOverCell(null);
    const ref = e.dataTransfer.getData("scenarioRef");
    if (!ref) return;
    const parts = ref.split(":");
    if (parts.length !== 2) return;
    const sideIdx = parseInt(parts[0]!, 10);
    const unitIdx = parseInt(parts[1]!, 10);
    if (isNaN(sideIdx) || isNaN(unitIdx)) return;
    const { x, y } = getCellFromEvent(e);
    onPlace(x as Cells, y as Cells, sideIdx, unitIdx);
  }

  // ---- Zone drawing ---------------------------------------------------------

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (zoneSideIdx < 0) return;
    const { x, y } = getCellFromEvent(e);
    setDraftZone({ ax: x, ay: y, bx: x, by: y });
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!draftZone) return;
    const { x, y } = getCellFromEvent(e);
    setDraftZone((d) => (d ? { ...d, bx: x, by: y } : d));
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!draftZone) return;
    const { x, y } = getCellFromEvent(e);
    const finalDraft = { ...draftZone, bx: x, by: y };
    setDraftZone(null);
    onZoneDefined(computeZone(finalDraft));
  }

  const cursor = zoneSideIdx >= 0 ? "crosshair" : "default";
  const visibleDraftZone = draftZone ? computeZone(draftZone) : null;

  return (
    <div className="scenario-map-scroll">
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ cursor, display: "block" }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {getTerrainCells(map.width, map.height, getTerrain)}
        <ZoneOverlay zones={zones} cs={cellSize} />

        {/* Draft zone while drawing */}
        {visibleDraftZone && (
          <rect
            x={visibleDraftZone.x * cellSize}
            y={visibleDraftZone.y * cellSize}
            width={visibleDraftZone.width * cellSize}
            height={visibleDraftZone.height * cellSize}
            fill="white"
            fillOpacity={0.3}
            stroke="white"
            strokeWidth={1}
          />
        )}

        {/* Placed units */}
        {placedUnits.map((pu) => (
          <UnitTokenBase
            key={`pu-${pu.sideIdx}-${pu.unitIdx}`}
            x={pu.x}
            y={pu.y}
            colour={pu.colour}
            label={pu.label}
            cs={cellSize}
            onClick={() => {
              onUnplace(pu.sideIdx, pu.unitIdx);
            }}
          />
        ))}

        {/* Drag-over highlight */}
        {dragOverCell && (
          <CellHighlight x={dragOverCell.x} y={dragOverCell.y} cs={cellSize} />
        )}
      </svg>
    </div>
  );
}
