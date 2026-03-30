import { useSelector } from "react-redux";

import { rollInitiative } from "../state/actions.js";
import { selectCanPass } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function InitiativePhase() {
  const dispatch = useAppDispatch();
  const canPass = useSelector(selectCanPass);

  return (
    <div>
      <button
        disabled={canPass}
        onClick={() => {
          dispatch(rollInitiative());
        }}
      >
        Roll
      </button>
    </div>
  );
}
