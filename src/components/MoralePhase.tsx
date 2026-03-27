import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { getMoraleStatus, rollMorale } from "../state/actions.js";
import { selectAllSides } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function MoralePhase() {
  const dispatch = useAppDispatch();
  const sides = useSelector(selectAllSides);

  const { side, message } = useMemo(() => getMoraleStatus(sides), [sides]);

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
