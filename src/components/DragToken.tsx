import { useSelector } from "react-redux";

import { selectSideEntities } from "../state/selectors.js";
import type { UnitEntity } from "../state/units.js";
import { classnames } from "../tools.js";
import { armourAbbreviation } from "../ui.js";

interface DragTokenProps {
  unit: UnitEntity;
  isDraggable?: boolean;
}

function DragToken({ unit, isDraggable = false }: DragTokenProps) {
  const sides = useSelector(selectSideEntities);

  const backgroundColor = sides[unit.side]?.colour ?? "black";

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;

    e.dataTransfer.setData("unitId", unit.id);
    e.dataTransfer.setData("sideId", unit.side.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={classnames("dragToken", { isDraggable })}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      style={{ backgroundColor }}
    >
      <div className="name">{unit.name}</div>
      <div className="icons">
        {unit.type.mounted && <span>🐴</span>}
        {unit.missile && <span>🏹</span>}
        <span>{armourAbbreviation[unit.type.armour]}</span>
      </div>
    </div>
  );
}

export default DragToken;
