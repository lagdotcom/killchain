import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";

import battle from "./battle.js";
import terrain from "./terrain.js";
import units from "./units.js";

const reducer = combineReducers({ battle, terrain, units });

export type RootState = ReturnType<typeof reducer>;

export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore(preloadedState ? { reducer, preloadedState } : { reducer });

type StoreType = ReturnType<typeof makeStore>;

export type AppDispatch = StoreType["dispatch"];
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
