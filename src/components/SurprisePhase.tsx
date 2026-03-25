import { useCallback, useState } from "react";
import { useSelector } from "react-redux";

import { pass } from "../state/actions.js";
import { addMessage } from "../state/battle.js";
import { selectAllSides, selectBattle } from "../state/selectors.js";
import { updateSide } from "../state/sides.js";
import { useAppDispatch } from "../state/store.js";
import { rollDice } from "../tools.js";

export function SurprisePhase() {
  const dispatch = useAppDispatch();
  const battle = useSelector(selectBattle);
  const sides = useSelector(selectAllSides);
  const [rolled, setRolled] = useState(false);

  const doPass = useCallback(
    () => dispatch(pass(battle, sides)),
    [battle, dispatch, sides],
  );

  const doRoll = useCallback(() => {
    for (const side of sides) {
      const dice = rollDice(6);
      const surprised = dice < 3;
      const result = surprised ? "Surprised!" : "OK";
      dispatch(
        addMessage(`${side.name} rolled ${dice} for surprise: ${result}`),
      );
      dispatch(updateSide({ id: side.id, changes: { surprised } }));
    }

    setRolled(true);
  }, [dispatch, sides]);

  return (
    <div>
      {rolled ? (
        <button onClick={doPass}>Pass</button>
      ) : (
        <button onClick={doRoll}>Roll</button>
      )}
    </div>
  );
}
