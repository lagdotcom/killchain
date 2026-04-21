import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import shuffle from "knuth-shuffle-seeded";

import type {
  MapId,
  SideId,
  TerrainId,
  UnitId,
  VictoryPoints,
} from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { OptionalRules } from "../killchain/types.js";
import {
  battleRoutResult,
  battleTimeoutResult,
  battleVictoryResult,
  sideInitiativeResult,
  sidePlacedAllUnits,
  sideSurpriseResult,
  unitAttackResult,
  unitChangesMoraleStatus,
  unitDispersed,
  unitFlees,
  unitLosingCoherence,
  unitMoraleResult,
  unitRouting,
} from "../messages.js";
import { without } from "../tools.js";
import {
  attackAction,
  changePhaseAction,
  initiativeAction,
  moraleAction,
  moveAction,
  placeUnitAction,
  routMoveAction,
  setupBattleAction,
  surpriseAction,
} from "./actions.js";
import type { VictoryCondition, VictoryZone } from "./scenarios.js";

export interface LogMessage {
  text: string;
  focus?: TerrainId;
}

export type BattleEvent =
  | {
      turn: number;
      type: "unit_damaged";
      unitId: UnitId;
      sideId: SideId;
      byUnitId: UnitId;
      bySideId: SideId;
    }
  | {
      turn: number;
      type: "unit_destroyed";
      unitId: UnitId;
      sideId: SideId;
      byUnitId: UnitId;
      bySideId: SideId;
    }
  | { turn: number; type: "unit_routed"; unitId: UnitId; sideId: SideId }
  | { turn: number; type: "unit_fled"; unitId: UnitId; sideId: SideId }
  | {
      turn: number;
      type: "zone_entered";
      unitId: UnitId;
      sideId: SideId;
      zoneIndex: number;
    };

export interface BattleState {
  activeUnitId: UnitId | undefined;
  allianceMap: Partial<Record<SideId, number>>;
  accumulatedZoneVP: Partial<Record<SideId, VictoryPoints>>;
  battleLog: BattleEvent[];
  canPass: boolean;
  exitedUnitIds: UnitId[];
  finalVP: Partial<Record<SideId, VictoryPoints>> | undefined;
  mapId: MapId | undefined;
  messages: LogMessage[];
  phase: Phase;
  rules: OptionalRules;
  sideOrder: SideId[];
  sideIndex: number;
  turn: number;
  turnLimit: number | undefined;
  victoryConditions: VictoryCondition[];
}

const initialState: BattleState = {
  activeUnitId: undefined,
  allianceMap: {},
  accumulatedZoneVP: {},
  battleLog: [],
  canPass: false,
  exitedUnitIds: [],
  finalVP: undefined,
  mapId: undefined,
  messages: [],
  phase: Phase.Placement,
  rules: {},
  sideOrder: [],
  sideIndex: NaN,
  turn: 0,
  turnLimit: undefined,
  victoryConditions: [],
};

function inZone(zone: VictoryZone, x: number, y: number): boolean {
  return (
    x >= zone.x &&
    x < zone.x + zone.width &&
    y >= zone.y &&
    y < zone.y + zone.height
  );
}

function isEnemyByAlliance(
  sideA: SideId,
  sideB: SideId,
  allianceMap: Partial<Record<SideId, number>>,
): boolean {
  if (sideA === sideB) return false;
  const a = allianceMap[sideA];
  const b = allianceMap[sideB];
  if (a === undefined || b === undefined) return true;
  return a !== b;
}

export const battleSlice = createSlice({
  name: "battle",
  initialState,
  reducers: {
    accumulateZoneVP(
      state,
      { payload }: PayloadAction<{ sideId: SideId; points: VictoryPoints }>,
    ) {
      const current =
        state.accumulatedZoneVP[payload.sideId] ?? (0 as VictoryPoints);
      state.accumulatedZoneVP[payload.sideId] = (current +
        payload.points) as VictoryPoints;
    },
    allowPass(state) {
      state.canPass = true;
    },
    nextSide(state) {
      state.sideIndex++;
      state.activeUnitId = undefined;
    },
    setActiveUnitId(state, { payload }: PayloadAction<UnitId | undefined>) {
      state.activeUnitId = payload;
    },
    setFinalVP(
      state,
      { payload }: PayloadAction<Partial<Record<SideId, VictoryPoints>>>,
    ) {
      state.finalVP = payload;
    },
    setMap(state, { payload }: PayloadAction<MapId>) {
      state.mapId = payload;
      state.activeUnitId = undefined;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(
        setupBattleAction,
        (
          state,
          {
            payload: { map, sides, units, victoryConditions, turnLimit, rules },
          },
        ) => {
          const deployable = sides
            .filter((s) => units.some((u) => u.side === s.id && isNaN(u.x)))
            .map((s) => s.id);

          const allianceMap: Partial<Record<SideId, number>> = {};
          for (const s of sides) {
            if (s.allianceId !== undefined) allianceMap[s.id] = s.allianceId;
          }

          state.activeUnitId = undefined;
          state.allianceMap = allianceMap;
          state.accumulatedZoneVP = {};
          state.battleLog = [];
          state.canPass = deployable.length === 0;
          state.exitedUnitIds = [];
          state.finalVP = undefined;
          state.mapId = map;
          state.messages = [];
          state.phase = Phase.Placement;
          state.sideIndex = deployable.length > 0 ? 0 : NaN;
          state.sideOrder = shuffle(deployable);
          state.rules = rules ?? {};
          state.turn = 0;
          state.turnLimit = turnLimit;
          state.victoryConditions = victoryConditions ?? [];
        },
      )
      .addCase(placeUnitAction, (state, { payload: { side } }) => {
        if (side.unplacedIds.length === 1) {
          state.messages.push(sidePlacedAllUnits(side));

          if (state.sideOrder.length === 1) {
            state.sideOrder = [];
            state.sideIndex = NaN;
            state.canPass = true;
            return;
          }
          state.sideOrder = without(state.sideOrder, side.id);
        }

        state.sideIndex = (state.sideIndex + 1) % state.sideOrder.length;
      })
      .addCase(
        changePhaseAction,
        (state, { payload: { phase, turn, sideOrder } }) => {
          state.phase = phase;
          state.turn = turn;
          state.activeUnitId = undefined;

          if (sideOrder) {
            state.sideOrder = sideOrder;
            state.sideIndex = 0;
          } else {
            state.sideIndex = NaN;
            state.canPass = false;
          }
        },
      )
      .addCase(
        attackAction,
        (
          state,
          { payload: { attacker, defender, hit, missile, mods, roll, target } },
        ) => {
          state.messages.push(
            unitAttackResult(attacker, defender, roll, target, hit, mods),
          );
          state.activeUnitId = undefined;

          if (hit) {
            const destroyed = defender.damage + 1 >= defender.type.hits;
            state.battleLog.push({
              turn: state.turn,
              type: destroyed ? "unit_destroyed" : "unit_damaged",
              unitId: defender.id,
              sideId: defender.side,
              byUnitId: attacker.id,
              bySideId: attacker.side,
            });
            if (destroyed)
              state.messages.push(
                missile
                  ? unitDispersed(defender)
                  : unitLosingCoherence(defender),
              );
          }
        },
      )
      .addCase(moveAction, (state, { payload: { unit, x, y, cost } }) => {
        if (unit.moved + cost >= unit.type.move) state.activeUnitId = undefined;

        for (let i = 0; i < state.victoryConditions.length; i++) {
          const cond = state.victoryConditions[i]!;
          if (cond.type !== "zone_violated") continue;
          if (!inZone(cond.zone, x, y)) continue;
          if (!isEnemyByAlliance(unit.side, cond.sideId, state.allianceMap))
            continue;
          state.battleLog.push({
            turn: state.turn,
            type: "zone_entered",
            unitId: unit.id,
            sideId: unit.side,
            zoneIndex: i,
          });
        }
      })
      .addCase(moraleAction, (state, { payload: { outcome, results } }) => {
        state.canPass = true;
        for (const { unit, roll, status } of results) {
          if (status === "Rout")
            state.battleLog.push({
              turn: state.turn,
              type: "unit_routed",
              unitId: unit.id,
              sideId: unit.side,
            });
          if (isNaN(roll))
            state.messages.push(unitChangesMoraleStatus(unit, status));
          else state.messages.push(unitMoraleResult(unit, roll, status));
        }

        if (outcome) {
          if (outcome.type === "timeout") {
            state.messages.push(battleTimeoutResult(outcome.winnerName));
          } else {
            state.messages.push(
              outcome.type === "rout"
                ? battleRoutResult()
                : battleVictoryResult(outcome.who),
            );
          }
          if (outcome.vp !== undefined) state.finalVP = outcome.vp;
          state.canPass = false;
          state.sideIndex = NaN;
          state.phase = Phase.Completed;
        }
      })
      .addCase(routMoveAction, (state, { payload: { unit, fled } }) => {
        state.messages.push(fled ? unitFlees(unit) : unitRouting(unit));
        if (fled) {
          state.battleLog.push({
            turn: state.turn,
            type: "unit_fled",
            unitId: unit.id,
            sideId: unit.side,
          });
          state.exitedUnitIds.push(unit.id);
        }
      })
      .addCase(surpriseAction, (state, { payload: { results } }) => {
        state.canPass = true;
        for (const { side, roll, surprised } of results)
          state.messages.push(sideSurpriseResult(side, roll, surprised));
      })
      .addCase(initiativeAction, (state, { payload: { results } }) => {
        state.canPass = true;
        for (const { side, roll } of results)
          state.messages.push(sideInitiativeResult(side, roll));
      }),
});

export const {
  accumulateZoneVP,
  allowPass,
  nextSide,
  setActiveUnitId,
  setFinalVP,
  setMap,
} = battleSlice.actions;

export default battleSlice.reducer;
