import { useMemo } from "react";
import { useSelector } from "react-redux";

import { BattlePhase } from "../state/battle.js";
import { selectAllUnits, selectBattle } from "../state/selectors.js";
import { isDefined } from "../tools.js";
import DragToken from "./DragToken.js";

export function UnplacedUnits() {
  const units = useSelector(selectAllUnits);
  const battle = useSelector(selectBattle);

  const unplacedUnits = units.filter((unit) => isNaN(unit.x));

  const tokens = useMemo(() => {
    return unplacedUnits.map((unit, index) => {
      return (
        <DragToken
          key={unit.id}
          unit={{
            ...unit,
            x: index % 4,
            y: Math.floor(index / 4),
          }}
          isDraggable={
            battle.phase === BattlePhase.Placement &&
            unit.side === battle.sidePlacing
          }
        />
      );
    });
  }, [battle.phase, battle.sidePlacing, unplacedUnits]);

  return (
    <div className="sidebar">
      <h3>Unplaced Units</h3>
      {isDefined(battle.sidePlacing) && (
        <p>Current turn: {battle.sides[battle.sidePlacing]?.name}</p>
      )}
      <div className="tokens">{tokens}</div>
    </div>
  );
}
