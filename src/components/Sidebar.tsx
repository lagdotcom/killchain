import { useSelector } from "react-redux";

import { BattlePhase } from "../state/battle.js";
import { selectBattle } from "../state/selectors.js";
import { UnplacedUnits } from "./UnplacedUnits.js";

export function Sidebar() {
  const battle = useSelector(selectBattle);

  return (
    <div className="sidebar">
      <div className="turn-phase">
        Turn {battle.turn}, {BattlePhase[battle.phase]}
      </div>

      {battle.phase === BattlePhase.Placement && <UnplacedUnits />}
    </div>
  );
}
