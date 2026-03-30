import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { UnitId } from "../flavours.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import { Phase } from "../killchain/rules.js";
import type { Unit } from "../killchain/types.js";
import {
  attackAction,
  changePhaseAction,
  initiativeAction,
  moraleAction,
  moveAction,
  placeUnitAction,
  routMoveAction,
  setupBattleAction,
} from "./actions.js";
import { eachEntity } from "./tools.js";

export interface UnitEntity extends Unit, XY {
  id: UnitId;
}

export const unitsAdapter = createEntityAdapter<UnitEntity>();
const unitsSlice = createSlice({
  name: "units",
  initialState: unitsAdapter.getInitialState(),
  reducers: {},
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
          const defenderChanges: Partial<UnitEntity> = {};
          if (!missile) {
            defenderChanges.flankCount = defender.flankCount + 1;
          }
          if (hit) defenderChanges.damage = defender.damage + 1;
          unitsAdapter.updateOne(state, {
            id: defender.id,
            changes: defenderChanges,
          });

          if (hit && missile && defender.damage + 1 >= defender.type.hits)
            unitsAdapter.removeOne(state, defender.id);

          unitsAdapter.updateOne(state, {
            id: attacker.id,
            changes: { ready: false },
          });
        },
      )
      .addCase(moveAction, (state, { payload: { unit, x, y, cost } }) => {
        unitsAdapter.updateOne(state, {
          id: unit.id,
          changes: { x, y, moved: unit.moved + cost },
        });
      })
      .addCase(moraleAction, (state, { payload: { results } }) => {
        unitsAdapter.updateMany(
          state,
          results.map(({ unit, status }) => ({
            id: unit.id,
            changes: { status },
          })),
        );
      })
      .addCase(
        routMoveAction,
        (state, { payload: { unit, x, y, fled, moved } }) => {
          if (fled) {
            unitsAdapter.removeOne(state, unit.id);
          } else {
            unitsAdapter.updateOne(state, {
              id: unit.id,
              changes: { x, y, moved },
            });
          }
        },
      )
      .addCase(initiativeAction, (state, { payload: { results } }) => {
        const sideIds = new Set(results.map(({ side }) => side.id));

        for (const unit of eachEntity(state)) {
          if (sideIds.has(unit.side) && unit.status === "Normal")
            unit.ready = true;
        }
      }),
});

export default unitsSlice.reducer;
