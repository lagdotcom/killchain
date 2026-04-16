import { useEffect } from "react";
import { useSelector } from "react-redux";

import { runAiTurn } from "../ai/index.js";
import { selectBattle, selectActiveSideIsAI, selectPhase } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

export function useAiPlayer() {
  const dispatch = useAppDispatch();
  const phase = useSelector(selectPhase);
  const sideIndex = useSelector(selectBattle).sideIndex;
  const isAiTurn = useSelector(selectActiveSideIsAI);

  useEffect(() => {
    if (!isAiTurn) return;
    const id = setTimeout(() => {
      dispatch(runAiTurn());
    }, 0);
    return () => clearTimeout(id);
  }, [phase, sideIndex, isAiTurn, dispatch]);
}
