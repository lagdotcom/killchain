import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { getMoraleStatus, rollMorale } from "../state/actions.js";
import { moraleStatusMessage } from "../state/messages.js";
import { selectAllSides } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function MoralePhase() {
  const dispatch = useAppDispatch();
  const sides = useSelector(selectAllSides);

  const status = useMemo(() => getMoraleStatus(sides), [sides]);
  const { side } = status;
  const message = moraleStatusMessage(status);

  const [disabled, setDisabled] = useState(!side);

  const rollForMorale = useCallback(() => {
    if (!side) return;

    dispatch(rollMorale(side));
    setDisabled(true);
  }, [dispatch, side]);

  return (
    <div>
      <div>{message}</div>
      <button onClick={rollForMorale} disabled={disabled}>
        Roll for Morale
      </button>
    </div>
  );
}
