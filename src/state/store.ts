import {
  type Action,
  combineReducers,
  configureStore,
  type ConfigureStoreOptions,
  type ThunkDispatch,
} from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";

import battle from "./battle.js";
import maps from "./maps.js";
import roster from "./roster.js";
import scenarios from "./scenarios.js";
import sides from "./sides.js";
import terrain from "./terrain.js";
import units from "./units.js";

const reducer = combineReducers({
  battle,
  maps,
  roster,
  scenarios,
  sides,
  terrain,
  units,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = ThunkDispatch<AppState, void, Action>;

export const makeStore = (preloadedState?: Partial<AppState>) => {
  const options: ConfigureStoreOptions<AppState> = { reducer };

  if (preloadedState) {
    const initial = reducer(undefined, { type: "@@INIT" });
    options.preloadedState = { ...initial, ...preloadedState };
  }

  const store = configureStore(options);
  return store as typeof store & { dispatch: AppDispatch };
};

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
