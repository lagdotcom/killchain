import { useState } from "react";
import type { Cells } from "../flavours.js";
import type { DeploymentZone } from "../killchain/types.js";
import type { MapEntity } from "../state/maps.js";
import { terrainColours } from "../ui.js";

const editorCellSize = 28;

export interface PlacedUnit {
  sideIdx: number;
  unitIdx: number;
  colour: string;
  label: string;
  x: Cells;
  y: Cells;
}

export interface ZoneInfo {
  sideIdx: number;
  colour: string;
  zone: DeploymentZone;
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
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);
  const [draftZone, setDraftZone] = useState<DraftZone | null>(null);
  const [zoneDrawing, setZoneDrawing] = useState(false);

  const svgWidth = map.width * editorCellSize;
  const svgHeight = map.height * editorCellSize;

  function getCellFromEvent(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      x: Math.floor(px / editorCellSize),
      y: Math.floor(py / editorCellSize),
    };
  }

  // ---- Drag-and-drop --------------------------------------------------------

  function handleDragOver(e: React.DragEvent<SVGSVGElement>) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cx = Math.floor(px / editorCellSize);
    const cy = Math.floor(py / editorCellSize);
    setDragOverCell({ x: cx, y: cy });
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
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cx = Math.floor(px / editorCellSize) as Cells;
    const cy = Math.floor(py / editorCellSize) as Cells;
    onPlace(cx, cy, sideIdx, unitIdx);
  }

  // ---- Zone drawing ---------------------------------------------------------

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (zoneSideIdx < 0) return;
    const { x, y } = getCellFromEvent(e);
    setDraftZone({ ax: x, ay: y, bx: x, by: y });
    setZoneDrawing(true);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!zoneDrawing || !draftZone) return;
    const { x, y } = getCellFromEvent(e);
    setDraftZone((d) => d ? { ...d, bx: x, by: y } : d);
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!zoneDrawing || !draftZone) return;
    const { x, y } = getCellFromEvent(e);
    const finalDraft = { ...draftZone, bx: x, by: y };
    setZoneDrawing(false);
    setDraftZone(null);
    onZoneDefined(computeZone(finalDraft));
  }

  const cursor = zoneSideIdx >= 0 ? "crosshair" : "default";

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
        {/* Terrain cells */}
        {map.cells.ids.map((id) => {
          const cell = map.cells.entities[id];
          if (!cell) return null;
          const colour = terrainColours[cell.type] ?? "#875";
          return (
            <rect
              key={String(id)}
              x={cell.x * editorCellSize}
              y={cell.y * editorCellSize}
              width={editorCellSize}
              height={editorCellSize}
              fill={colour}
            />
          );
        })}

        {/* Grid overlay */}
        {Array.from({ length: map.width + 1 }, (_, i) => (
          <line
            key={`vg${i}`}
            x1={i * editorCellSize}
            y1={0}
            x2={i * editorCellSize}
            y2={svgHeight}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: map.height + 1 }, (_, i) => (
          <line
            key={`hg${i}`}
            x1={0}
            y1={i * editorCellSize}
            x2={svgWidth}
            y2={i * editorCellSize}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.5}
          />
        ))}

        {/* Deployment zones */}
        {zones.map((z) => (
          <rect
            key={`zone-${z.sideIdx}`}
            x={z.zone.x * editorCellSize}
            y={z.zone.y * editorCellSize}
            width={z.zone.width * editorCellSize}
            height={z.zone.height * editorCellSize}
            fill={z.colour}
            fillOpacity={0.25}
            stroke={z.colour}
            strokeWidth={1}
            strokeOpacity={0.6}
          />
        ))}

        {/* Draft zone while drawing */}
        {draftZone && (() => {
          const zone = computeZone(draftZone);
          return (
            <rect
              x={zone.x * editorCellSize}
              y={zone.y * editorCellSize}
              width={zone.width * editorCellSize}
              height={zone.height * editorCellSize}
              fill="white"
              fillOpacity={0.3}
              stroke="white"
              strokeWidth={1}
            />
          );
        })()}

        {/* Placed units */}
        {placedUnits.map((pu) => {
          const cx = pu.x * editorCellSize + editorCellSize / 2;
          const cy = pu.y * editorCellSize + editorCellSize / 2;
          const r = editorCellSize * 0.35;
          return (
            <g
              key={`pu-${pu.sideIdx}-${pu.unitIdx}`}
              style={{ cursor: "pointer" }}
              onClick={() => onUnplace(pu.sideIdx, pu.unitIdx)}
            >
              <circle cx={cx} cy={cy} r={r} fill={pu.colour} stroke="white" strokeWidth={1} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={editorCellSize * 0.3}
                fill="white"
                pointerEvents="none"
              >
                {pu.label}
              </text>
            </g>
          );
        })}

        {/* Drag-over highlight */}
        {dragOverCell && (
          <rect
            x={dragOverCell.x * editorCellSize}
            y={dragOverCell.y * editorCellSize}
            width={editorCellSize}
            height={editorCellSize}
            fill="none"
            stroke="white"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
