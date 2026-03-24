import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { selectBattle } from "../state/selectors.js";
import type { UnitState } from "../state/units.js";

interface DragTokenProps {
  unit: UnitState;
  isDraggable?: boolean;
}

function DragToken({ unit, isDraggable = false }: DragTokenProps) {
  const battle = useSelector(selectBattle);
  const [dragging, setDragging] = useState(false);

  const sideColor = battle.sides[unit.side]?.colour;

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;

    setDragging(true);
    e.dataTransfer.setData("text/plain", unit.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const cursor = useMemo(() => {
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
        backgroundColor: sideColor,
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
