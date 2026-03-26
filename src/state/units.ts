import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { Unit } from "../killchain/types.js";
import {
  attackAction,
  changePhaseAction,
  moveAction,
  placeUnitAction,
  setupBattleAction,
} from "./actions.js";

export interface UnitEntity extends Unit {
  id: UnitId;
  x: Cells;
  y: Cells;
}

export const unitsAdapter = createEntityAdapter<UnitEntity>();
const unitsSlice = createSlice({
  name: "units",
  initialState: unitsAdapter.getInitialState(),
  reducers: {
    addUnit: unitsAdapter.addOne,
    addUnits: unitsAdapter.addMany,
    updateUnit: unitsAdapter.updateOne,
    removeUnit: unitsAdapter.removeOne,
  },
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { units } }) =>
        unitsAdapter.setAll(state, units),
      )
      .addCase(placeUnitAction, (state, { payload: { unit, x, y } }) =>
        unitsAdapter.updateOne(state, { id: unit.id, changes: { x, y } }),
      )
      .addCase(changePhaseAction, (state, { payload: { phase } }) => {
        if (phase === Phase.Morale)
          for (const id of state.ids) {
            const unit = state.entities[id]!;
            unit.acted = false;
            unit.moved = 0;
          }
      })
      .addCase(
        attackAction,
        (state, { payload: { attacker, defender, hit } }) => {
          if (hit) {
            const victim = state.entities[defender.id]!;
            victim.damage++;

            if (victim.damage >= victim.type.hits)
              unitsAdapter.removeOne(state, victim.id);
          }
          state.entities[attacker.id]!.acted = true;
        },
      )
      .addCase(moveAction, (state, { payload: { unit, x, y, cost } }) => {
        const u = state.entities[unit.id]!;
        u.x = x;
        u.y = y;
        u.moved += cost;
      }),
});

export const { addUnit, addUnits, updateUnit, removeUnit } = unitsSlice.actions;

export default unitsSlice.reducer;
