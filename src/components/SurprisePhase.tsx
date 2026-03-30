import { useSelector } from "react-redux";

import { rollSurprise } from "../state/actions.js";
import { selectCanPass } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function SurprisePhase() {
  const dispatch = useAppDispatch();
  const canPass = useSelector(selectCanPass);

  return (
    <div>
      <button
        disabled={canPass}
        onClick={() => {
          dispatch(rollSurprise());
        }}
      >
        Roll
      </button>
    </div>
  );
}
