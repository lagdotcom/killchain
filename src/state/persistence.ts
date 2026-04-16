import type { AppState } from "./store.js";

const STORAGE_KEY = "killchain-v1";

type PersistedSlices = Pick<AppState, "maps" | "roster" | "scenarios">;

export function loadPersistedState(): PersistedSlices | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as PersistedSlices;
  } catch {
    return undefined;
  }
}

export function persistState(state: AppState): void {
  try {
    const slices: PersistedSlices = {
      maps: state.maps,
      roster: state.roster,
      scenarios: state.scenarios,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slices));
  } catch {
    // Ignore storage quota errors
  }
}
