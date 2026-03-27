import {
  type Action,
  combineReducers,
  configureStore,
  type ConfigureStoreOptions,
  type ThunkAction,
  type ThunkDispatch,
} from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";

import battle from "./battle.js";
import sides from "./sides.js";
import terrain from "./terrain.js";
import units from "./units.js";

const reducer = combineReducers({ battle, sides, terrain, units });

export type AppState = ReturnType<typeof reducer>;
export type AppAction = Action | ThunkAction<void, AppState, void, Action>;
export type AppDispatch = ThunkDispatch<AppState, void, Action>;

export const makeStore = (preloadedState?: Partial<AppState>) => {
  const options: ConfigureStoreOptions<AppState, AppAction> = { reducer };

  if (preloadedState) {
    const initial = reducer(undefined, { type: "@@INIT" });
    options.preloadedState = { ...initial, ...preloadedState };
  }

  return configureStore(options);
};

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
