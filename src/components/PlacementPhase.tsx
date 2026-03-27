import { useMemo } from "react";
import { useSelector } from "react-redux";

import { selectActiveSide, selectUnplacedUnits } from "../state/selectors.js";
import DragToken from "./DragToken.js";

export function PlacementPhase() {
  const activeSide = useSelector(selectActiveSide);
  const unplacedUnits = useSelector(selectUnplacedUnits);

  const tokens = useMemo(() => {
    return unplacedUnits.map((unit) => {
      return (
        <DragToken
          key={unit.id}
          unit={unit}
          isDraggable={unit.side === activeSide?.id}
        />
      );
    });
  }, [activeSide, unplacedUnits]);

  return (
    <div className="unplaced">
      <h3>Unplaced Units</h3>
      {activeSide && <div className="tokens">{tokens}</div>}
    </div>
  );
}
