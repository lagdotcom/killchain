import type { Action, ActionCreator, ThunkAction } from "@reduxjs/toolkit";

import { Phase } from "../killchain/rules.js";
import { pass, rollInitiative, rollSurprise } from "../state/actions.js";
import {
  selectActiveSide,
  selectAllSides,
  selectBattle,
  selectPhase,
} from "../state/selectors.js";
import type { AppState } from "../state/store.js";
import { aiMelee, aiMissile, aiMorale, aiMove, aiPlacement } from "./phases.js";
import { AI_CONFIGS } from "./types.js";

type Thunk<T = void> = ActionCreator<ThunkAction<T, AppState, void, Action>>;

export const runAiTurn: Thunk = () => (dispatch, getState) => {
  const state = getState();
  const phase = selectPhase(state);
  const battle = selectBattle(state);

  // Surprise, Initiative, and Morale have no active side (sideIndex=NaN).
  // Drive them automatically when at least one side is AI-controlled.
  if (
    phase === Phase.Surprise ||
    phase === Phase.Initiative ||
    phase === Phase.Morale
  ) {
    if (!selectAllSides(state).some((s) => s.aiPersonality)) return;

    switch (phase) {
      case Phase.Surprise:
        if (!battle.canPass) {
          dispatch(rollSurprise());
          dispatch(pass());
        }
        break;
      case Phase.Initiative:
        if (!battle.canPass) {
          dispatch(rollInitiative());
          dispatch(pass());
        }
        break;
      case Phase.Morale:
        dispatch(aiMorale());
        break;
    }
    return;
  }

  const activeSide = selectActiveSide(state);
  if (!activeSide?.aiPersonality) return;

  const config = AI_CONFIGS[activeSide.aiPersonality] ?? AI_CONFIGS.aggressive;

  switch (phase) {
    case Phase.Placement:
      dispatch(aiPlacement(activeSide, config));
      break;

    case Phase.Missile:
      dispatch(aiMissile(activeSide, config));
      dispatch(pass());
      break;

    case Phase.Move:
      dispatch(aiMove(activeSide, config));
      dispatch(pass());
      break;

    case Phase.Melee:
      dispatch(aiMelee(activeSide, config));
      dispatch(pass());
      break;

    default:
      break;
  }
};
