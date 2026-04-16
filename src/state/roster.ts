import {
  createEntityAdapter,
  createSlice,
  nanoid,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type { UnitDefinitionId } from "../flavours.js";
import type { UnitDefinition } from "../killchain/types.js";

export const rosterAdapter = createEntityAdapter<UnitDefinition>();

const rosterSlice = createSlice({
  name: "roster",
  initialState: rosterAdapter.getInitialState(),
  reducers: {
    addDefinition: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      reducer: rosterAdapter.addOne,
      prepare: (def: Omit<UnitDefinition, "id">) => ({
        payload: { ...def, id: nanoid() as UnitDefinitionId },
      }),
    },
    updateDefinition(
      state,
      {
        payload,
      }: PayloadAction<{
        id: UnitDefinitionId;
        changes: Partial<Omit<UnitDefinition, "id">>;
      }>,
    ) {
      const def = state.entities[payload.id];
      if (!def) return;
      Object.assign(def, payload.changes);
    },
    // eslint-disable-next-line @typescript-eslint/unbound-method
    removeDefinition: rosterAdapter.removeOne,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    setAllDefinitions: rosterAdapter.setAll,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    upsertDefinitions: rosterAdapter.upsertMany,
  },
});

export const {
  addDefinition,
  updateDefinition,
  removeDefinition,
  setAllDefinitions,
  upsertDefinitions,
} = rosterSlice.actions;

export default rosterSlice.reducer;
