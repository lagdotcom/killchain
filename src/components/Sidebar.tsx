import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Phase } from "../killchain/rules.js";
import { pass } from "../state/actions.js";
import {
  selectActiveSide,
  selectAllSides,
  selectBattle,
  selectLogMessages,
  selectPhase,
  selectTurn,
} from "../state/selectors.js";
import { InitiativePhase } from "./InitiativePhase.js";
import { PlacementPhase } from "./PlacementPhase.js";
import { SurprisePhase } from "./SurprisePhase.js";

export function Sidebar() {
  const side = useSelector(selectActiveSide);
  const log = useSelector(selectLogMessages);
  const phase = useSelector(selectPhase);
  const turn = useSelector(selectTurn);

  const battle = useSelector(selectBattle);
  const sides = useSelector(selectAllSides);
  const dispatch = useDispatch();
  const doPass = useCallback(
    () => dispatch(pass(battle, sides)),
    [battle, dispatch, sides],
  );

  return (
    <div className="sidebar">
      <div className="main">
        <div className="turn-phase">
          {turn > 0 && <span>Turn {turn}, </span>}
          {Phase[phase]}
          {side && <span>, {side.name}</span>}
        </div>

        <div>
          <button onClick={doPass}>Pass</button>
        </div>

        {phase === Phase.Placement && <PlacementPhase />}
        {phase === Phase.Surprise && <SurprisePhase />}
        {phase === Phase.Initiative && <InitiativePhase />}
      </div>
      <div className="messages">
        {log.toReversed().map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
    </div>
  );
}
