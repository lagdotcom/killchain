import { type CSSProperties, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { selectSideEntities } from "../state/selectors.js";
import type { UnitState } from "../state/units.js";

interface DragTokenProps {
  unit: UnitState;
  isDraggable?: boolean;
}

function DragToken({ unit, isDraggable = false }: DragTokenProps) {
  const sides = useSelector(selectSideEntities);
  const [dragging, setDragging] = useState(false);

  const backgroundColor = sides[unit.side]?.colour ?? "black";

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;

    setDragging(true);
    e.dataTransfer.setData("unitId", unit.id);
    e.dataTransfer.setData("sideId", unit.side.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const cursor = useMemo<CSSProperties["cursor"]>(() => {
    if (dragging) return "grabbing";
    else if (isDraggable) return "grab";
  }, [dragging, isDraggable]);

  return (
    <div
      className="dragToken"
      draggable={isDraggable}
      onDragStart={handleDragStart}
      style={{
        cursor,
        backgroundColor,
        opacity: isDraggable ? 1 : 0.6,
      }}
    >
      <span className="name">{unit.name}</span>
      <span className="icons">
        {unit.type.mounted && "🐴"}
        {unit.missile && "🏹"}
      </span>
    </div>
  );
}

export default DragToken;
