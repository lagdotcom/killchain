import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

import type { SideId, UnitId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { without } from "../tools.js";
import {
  attackAction,
  changePhaseAction,
  deployUnitAction,
  initiativeAction,
  placeUnitAction,
  setupBattleAction,
  surpriseAction,
} from "./actions.js";
import { eachEntity } from "./tools.js";

export interface SideEntity {
  id: SideId;
  colour: string;
  name: string;
  unplacedIds: UnitId[];
  surprised: boolean;
  casualties: number;
  initiative: number;
}

export const sidesAdapter = createEntityAdapter<SideEntity>();
const sidesSlice = createSlice({
  name: "sides",
  initialState: sidesAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(setupBattleAction, (state, { payload: { sides, units } }) =>
        sidesAdapter.setAll(
          state,
          sides.map((side) => ({
            ...side,
            casualties: 0,
            initiative: NaN,
            surprised: false,
            unplacedIds: units
              .filter((u) => isNaN(u.x) && u.side === side.id)
              .map((u) => u.id),
          })),
        ),
      )
      .addCase(
        deployUnitAction,
        (state, { payload: { sideId, unitId } }) => {
          const side = state.entities[sideId];
          if (side) side.unplacedIds.push(unitId);
        },
      )
      .addCase(placeUnitAction, (state, { payload: { side, unit } }) =>
        sidesAdapter.updateOne(state, {
          id: side.id,
          changes: { unplacedIds: without(side.unplacedIds, unit.id) },
        }),
      )
      .addCase(changePhaseAction, (state, { payload: { phase } }) => {
        if (phase === Phase.Morale)
          for (const side of eachEntity(state)) side.surprised = false;
        else if (phase === Phase.Initiative)
          for (const side of eachEntity(state)) side.casualties = 0;
      })
      .addCase(attackAction, (state, { payload: { hit, defender } }) => {
        const side = state.entities[defender.side];
        if (hit && side) side.casualties++;
      })
      .addCase(surpriseAction, (state, { payload: { results } }) =>
        sidesAdapter.updateMany(
          state,
          results.map(({ side, surprised }) => ({
            id: side.id,
            changes: { surprised },
          })),
        ),
      )
      .addCase(initiativeAction, (state, { payload: { results } }) =>
        sidesAdapter.updateMany(
          state,
          results.map(({ side, roll }) => ({
            id: side.id,
            changes: { initiative: roll },
          })),
        ),
      ),
});

export default sidesSlice.reducer;
