import { useMemo } from "react";
import { useSelector } from "react-redux";

import { pass } from "../state/actions.js";
import {
  selectActiveSide,
  selectAllSides,
  selectBattle,
  selectUnplacedUnits,
} from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";
import DragToken from "./DragToken.js";

export function PlacementPhase() {
  const dispatch = useAppDispatch();
  const activeSide = useSelector(selectActiveSide);
  const battle = useSelector(selectBattle);
  const sides = useSelector(selectAllSides);
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

      {activeSide ? (
        <div className="tokens">{tokens}</div>
      ) : (
        <button onClick={() => dispatch(pass(battle, sides))}>Begin</button>
      )}
    </div>
  );
}
