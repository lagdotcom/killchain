import { useSelector } from "react-redux";

import { Phase } from "../killchain/rules.js";
import { selectActiveSide, selectBattle } from "../state/selectors.js";
import { InitiativePhase } from "./InitiativePhase.js";
import { PlacementPhase } from "./PlacementPhase.js";
import { SurprisePhase } from "./SurprisePhase.js";

export function Sidebar() {
  const battle = useSelector(selectBattle);
  const activeSide = useSelector(selectActiveSide);

  return (
    <div className="sidebar">
      <div className="main">
        <div className="turn-phase">
          {battle.turn > 0 && <span>Turn {battle.turn}, </span>}
          {Phase[battle.phase]}
          {activeSide && <span>, {activeSide.name}</span>}
        </div>

        {battle.phase === Phase.Placement && <PlacementPhase />}
        {battle.phase === Phase.Surprise && <SurprisePhase />}
        {battle.phase === Phase.Initiative && <InitiativePhase />}
      </div>
      <div className="messages">
        {battle.messages.toReversed().map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
    </div>
  );
}
