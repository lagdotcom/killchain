import type { Action, ActionCreator, ThunkAction } from "@reduxjs/toolkit";

import { Phase } from "../killchain/rules.js";
import { pass, rollInitiative, rollSurprise } from "../state/actions.js";
import {
  selectActiveSide,
  selectBattle,
  selectPhase,
} from "../state/selectors.js";
import type { AppState } from "../state/store.js";
import { aiMelee, aiMissile, aiMorale, aiMove, aiPlacement } from "./phases.js";
import { AI_CONFIGS } from "./types.js";

type Thunk<T = void> = ActionCreator<ThunkAction<T, AppState, void, Action>>;

export const runAiTurn: Thunk = () => (dispatch, getState) => {
  const state = getState();
  const activeSide = selectActiveSide(state);
  if (!activeSide?.aiPersonality) return;

  const config = AI_CONFIGS[activeSide.aiPersonality] ?? AI_CONFIGS.aggressive;
  const phase = selectPhase(state);
  const battle = selectBattle(state);

  switch (phase) {
    case Phase.Placement:
      dispatch(aiPlacement(activeSide, config));
      break;

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

    case Phase.Morale:
      dispatch(aiMorale());
      break;

    default:
      break;
  }
};
