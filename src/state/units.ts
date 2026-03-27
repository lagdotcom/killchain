import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { Cells, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { Unit } from "../killchain/types.js";
import {
  attackAction,
  changePhaseAction,
  initiativeAction,
  moraleAction,
  moveAction,
  placeUnitAction,
  setupBattleAction,
} from "./actions.js";
import { eachEntity } from "./tools.js";

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
          for (const unit of eachEntity(state)) {
            if (unit.damage >= unit.type.hits) {
              unitsAdapter.removeOne(state, unit.id);
              continue;
            }

            unit.moved = 0;
            unit.flankCount = 0;
          }
      })
      .addCase(
        attackAction,
        (state, { payload: { attacker, defender, hit, missile } }) => {
          const victim = state.entities[defender.id]!;
          if (!missile) {
            victim.meleeReady = true;
            victim.flankCount++;
          }

          if (hit) {
            victim.damage++;

            if (missile && victim.damage >= victim.type.hits)
              unitsAdapter.removeOne(state, victim.id);
          }

          const unit = state.entities[attacker.id]!;
          unit.ready = false;
          unit.meleeReady = !missile;
        },
      )
      .addCase(moveAction, (state, { payload: { unit, x, y, cost } }) => {
        const u = state.entities[unit.id]!;
        u.x = x;
        u.y = y;
        u.moved += cost;
      })
      .addCase(moraleAction, (state, { payload: { results } }) => {
        for (const { unit, status } of results)
          state.entities[unit.id]!.status = status;
      })
      .addCase(initiativeAction, (state, { payload: { results } }) => {
        const sideIds = new Set(results.map(({ side }) => side.id));

        for (const unit of eachEntity(state)) {
          if (sideIds.has(unit.side)) unit.ready = true;
        }
      }),
});

export const { addUnit, addUnits, updateUnit, removeUnit } = unitsSlice.actions;

export default unitsSlice.reducer;
