import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { moraleStatusMessage } from "../messages.js";
import { getMoraleStatus, rollMorale } from "../state/actions.js";
import { selectAllSides, selectAllUnits } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function MoralePhase() {
  const dispatch = useAppDispatch();
  const sides = useSelector(selectAllSides);
  const units = useSelector(selectAllUnits);

  const status = useMemo(() => getMoraleStatus(sides), [sides]);
  const { side } = status;
  const message = moraleStatusMessage(status);

  const hasShaken = useMemo(
    () => units.some((u) => u.status === "Shaken"),
    [units],
  );
  const needsRoll = !!side || hasShaken;

  const [disabled, setDisabled] = useState(!needsRoll);

  const rollForMorale = useCallback(() => {
    if (!needsRoll) return;

    dispatch(rollMorale(side));
    setDisabled(true);
  }, [dispatch, needsRoll, side]);

  return (
    <div>
      <div>{message}</div>
      <button onClick={rollForMorale} disabled={disabled}>
        Roll for Morale
      </button>
    </div>
  );
}
