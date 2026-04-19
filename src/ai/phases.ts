import type { Action, ActionCreator, ThunkAction } from "@reduxjs/toolkit";

import { type XY, xyId } from "../killchain/EuclideanEngine.js";
import { longRangeMax } from "../killchain/rules.js";
import { KillChainEngine } from "../KillChainEngine.js";
import { isInDeploymentZone } from "../logic.js";
import { findBestMove } from "../movement.js";
import {
  attack,
  getMoraleStatus,
  moveAction,
  pass,
  placeUnitAction,
  rollMorale,
} from "../state/actions.js";
import { setActiveUnitId } from "../state/battle.js";
import {
  selectAllSides,
  selectAllUnits,
  selectBattle,
  selectMap,
  selectSideEntities,
  selectUnitEntities,
} from "../state/selectors.js";
import type { SideEntity } from "../state/sides.js";
import { isEnemy } from "../state/sides.js";
import type { AppState } from "../state/store.js";
import { manhattanDistance } from "../tools.js";
import {
  scoreAttackTarget,
  scoreMoveCell,
  scorePlacementCell,
} from "./scoring.js";
import type { AiConfig, VpContext } from "./types.js";

type Thunk<T = void> = ActionCreator<ThunkAction<T, AppState, void, Action>>;

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export const aiPlacement: Thunk =
  (side: SideEntity, config: AiConfig) => (dispatch, getState) => {
    const map = selectMap(getState());
    if (!map) return;

    // Loop as long as this side is still active. When sideIndex rotates to a
    // human (or other AI) side we stop — the hook will re-trigger on the next
    // sideIndex change. When sideIndex stays the same (only one side left in
    // the rotation) we keep going so all units get placed in one thunk call.
    for (;;) {
      const currentState = getState();

      // Stop if it's no longer this side's turn.
      const sideEntities = selectSideEntities(currentState);
      const sideEntity = sideEntities[side.id];
      if (!sideEntity) break;

      const activeSideId =
        currentState.battle.sideOrder[currentState.battle.sideIndex];
      if (activeSideId !== side.id) break;

      if (sideEntity.unplacedIds.length === 0) {
        if (selectBattle(currentState).canPass) dispatch(pass());
        break;
      }

      const unitId = sideEntity.unplacedIds[0];
      const allUnits = selectAllUnits(currentState);
      const unit = allUnits.find((u) => u.id === unitId);
      if (!unit) break;

      const zone = sideEntity.deploymentZone;
      const placedPositions = allUnits
        .filter((u) => !isNaN(u.x))
        .map((u) => ({ x: u.x, y: u.y }));
      const occupiedIds = new Set(placedPositions.map((p) => xyId(p.x, p.y)));

      const candidates: XY[] = [];
      for (const cell of Object.values(map.cells.entities)) {
        if (occupiedIds.has(cell.id)) continue;
        if (zone && !isInDeploymentZone(zone, cell.x, cell.y)) continue;
        if (!zone) {
          const usesTop = (side.id as number) % 2 === 0;
          if (usesTop && cell.y >= Math.floor(map.height / 3)) continue;
          if (!usesTop && cell.y < Math.ceil((2 * map.height) / 3)) continue;
        }
        candidates.push({ x: cell.x, y: cell.y });
      }

      if (candidates.length === 0) break;

      let best: XY | undefined;
      let bestScore = -Infinity;
      for (const cell of candidates) {
        const s = scorePlacementCell(
          cell,
          zone,
          unit,
          placedPositions,
          map,
          config,
        );
        if (s > bestScore) {
          bestScore = s;
          best = cell;
        }
      }

      if (!best) break;
      dispatch(
        placeUnitAction({ side: sideEntity, unit, x: best.x, y: best.y }),
      );

      if (selectBattle(getState()).canPass) {
        dispatch(pass());
        break;
      }
    }
  };

// ---------------------------------------------------------------------------
// Missile
// ---------------------------------------------------------------------------

export const aiMissile: Thunk =
  (side: SideEntity, config: AiConfig) => (dispatch, getState) => {
    const state = getState();
    const map = selectMap(state);
    if (!map) return;

    const battle = selectBattle(state);
    const vpContext: VpContext = {
      conditions: battle.victoryConditions,
      sideId: side.id,
      turn: battle.turn,
      ...(battle.turnLimit !== undefined && { turnLimit: battle.turnLimit }),
      allianceMap: battle.allianceMap,
    };

    const myUnits = selectAllUnits(state).filter(
      (u) =>
        u.side === side.id &&
        u.missile &&
        u.ready &&
        u.status !== "Rout" &&
        !isNaN(u.x),
    );

    for (const unit of myUnits) {
      // Re-read live state each iteration — previous attacks may have removed enemies.
      const liveUnits = selectAllUnits(getState());
      const unitEntities = selectUnitEntities(getState());
      const sideEntities = selectSideEntities(getState());
      const g = new KillChainEngine(map, unitEntities);

      const targets = liveUnits.filter((e) => {
        if (
          !isEnemy(side.id, e.side, sideEntities) ||
          e.status === "Rout" ||
          isNaN(e.x)
        )
          return false;
        if (e.damage >= e.type.hits) return false; // already destroyed
        const dist = manhattanDistance(unit, e) * map.cellSize;
        return dist > map.cellSize && dist <= longRangeMax;
      });
      if (targets.length === 0) continue;

      let best = targets[0]!;
      let bestScore = -Infinity;
      for (const t of targets) {
        let s: number;
        if (config.missilePriority === "strongest") {
          s = t.type.hits - t.damage;
        } else if (config.missilePriority === "weakest") {
          s = scoreAttackTarget(unit, t, g, true, config.focusFire, vpContext);
        } else {
          s =
            scoreAttackTarget(unit, t, g, true, config.focusFire, vpContext) -
            manhattanDistance(unit, t) * 0.01;
        }
        if (s > bestScore) {
          bestScore = s;
          best = t;
        }
      }

      dispatch(setActiveUnitId(unit.id));
      dispatch(attack(best));
    }
  };

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

export const aiMove: Thunk =
  (side: SideEntity, config: AiConfig) => (dispatch, getState) => {
    const map = selectMap(getState());
    if (!map) return;

    const initialState = getState();
    const battle = selectBattle(initialState);
    const vpContext: VpContext = {
      conditions: battle.victoryConditions,
      sideId: side.id,
      turn: battle.turn,
      ...(battle.turnLimit !== undefined && { turnLimit: battle.turnLimit }),
      allianceMap: battle.allianceMap,
    };

    const sides = selectAllSides(initialState);
    const allUnits = selectAllUnits(initialState);
    const totalUnits = allUnits.filter((u) => u.side === side.id).length;
    const sideEntity = sides.find((s) => s.id === side.id);
    const casualties = sideEntity?.casualties ?? 0;
    const underPressure =
      config.retreatThreshold > 0 && totalUnits > 0
        ? casualties / totalUnits >= config.retreatThreshold
        : false;

    const myUnitIds = allUnits
      .filter(
        (u) =>
          u.side === side.id &&
          (u.status === "Normal" || u.status === "Shaken") &&
          !isNaN(u.x) &&
          u.moved < u.type.move,
      )
      .map((u) => u.id);

    for (const unitId of myUnitIds) {
      // Re-read state to get up-to-date positions after previous moves.
      const unitEntities = selectUnitEntities(getState());
      const unit = unitEntities[unitId];
      if (!unit || unit.moved >= unit.type.move) continue;

      const currentSideEntities = selectSideEntities(getState());
      const liveEnemies = selectAllUnits(getState()).filter(
        (u) =>
          isEnemy(side.id, u.side, currentSideEntities) &&
          u.status !== "Rout" &&
          !isNaN(u.x),
      );

      // Shaken units must retreat and may not advance toward any enemy.
      if (unit.status === "Shaken") {
        const currentDists = new Map(
          liveEnemies.map((e) => [e.id, manhattanDistance(unit, e)]),
        );
        const adjacentEnemies = liveEnemies.filter(
          (e) => currentDists.get(e.id) === 1,
        );
        const noAdvance = (cell: XY) =>
          liveEnemies.every(
            (e) => manhattanDistance(cell, e) >= currentDists.get(e.id)!,
          );
        const exitMelee = (cell: XY) =>
          adjacentEnemies.every((e) => manhattanDistance(cell, e) > 1);
        const satisfiesBoth = (cell: XY) => noAdvance(cell) && exitMelee(cell);

        // Score by maximising distance from nearest enemy.
        const retreatScore = (cell: XY) =>
          liveEnemies.length > 0
            ? Math.min(...liveEnemies.map((e) => manhattanDistance(cell, e)))
            : 0;

        const best =
          findBestMove(unit, unitEntities, map, retreatScore, satisfiesBoth) ??
          (adjacentEnemies.length > 0
            ? findBestMove(unit, unitEntities, map, retreatScore, exitMelee)
            : undefined);

        if (!best) continue;
        dispatch(setActiveUnitId(unitId));
        dispatch(moveAction({ unit, x: best.x, y: best.y, cost: best.cost }));
        continue;
      }

      const retreating =
        underPressure || (config.holdBackIfDamaged && unit.damage > 0);

      const skipAdvance =
        !config.chargeRecklessly &&
        config.preferRanged &&
        unit.missile &&
        !retreating;

      if (
        skipAdvance &&
        liveEnemies.every((e) => manhattanDistance(unit, e) > 1)
      )
        continue;

      // neverPassMelee: always close to contact when any enemy is within 2 cells.
      const seekMelee =
        config.neverPassMelee &&
        liveEnemies.some((e) => manhattanDistance(unit, e) <= 2);

      const effectiveConfig = retreating
        ? { ...config, holdBackIfDamaged: true }
        : config;

      const score = (cell: XY) =>
        scoreMoveCell(cell, liveEnemies, effectiveConfig, unit, map, vpContext);

      const best = findBestMove(unit, unitEntities, map, score);
      if (!best) continue;

      // Don't advance if standing still scores better (avoids pointless shuffling).
      if (!retreating && !config.chargeRecklessly && !seekMelee) {
        const currentScore = scoreMoveCell(
          { x: unit.x, y: unit.y },
          liveEnemies,
          config,
          unit,
          map,
          vpContext,
        );
        if (score(best) < currentScore) continue;
      }

      dispatch(setActiveUnitId(unitId));
      dispatch(moveAction({ unit, x: best.x, y: best.y, cost: best.cost }));
    }
  };

// ---------------------------------------------------------------------------
// Melee
// ---------------------------------------------------------------------------

export const aiMelee: Thunk =
  (side: SideEntity, config: AiConfig) => (dispatch, getState) => {
    const map = selectMap(getState());
    if (!map) return;

    const meleeBattle = selectBattle(getState());
    const meleeVpContext: VpContext = {
      conditions: meleeBattle.victoryConditions,
      sideId: side.id,
      turn: meleeBattle.turn,
      ...(meleeBattle.turnLimit !== undefined && {
        turnLimit: meleeBattle.turnLimit,
      }),
      allianceMap: meleeBattle.allianceMap,
    };

    const myUnitIds = selectAllUnits(getState())
      .filter((u) => u.side === side.id && u.ready && !isNaN(u.x))
      .map((u) => u.id);

    for (const unitId of myUnitIds) {
      const unitEntities = selectUnitEntities(getState());
      const unit = unitEntities[unitId];
      if (!unit || !unit.ready) continue;

      const g = new KillChainEngine(map, unitEntities);

      const meleeSideEntities = selectSideEntities(getState());
      const liveEnemies = selectAllUnits(getState()).filter(
        (u) =>
          isEnemy(side.id, u.side, meleeSideEntities) &&
          u.status !== "Rout" &&
          !isNaN(u.x) &&
          u.damage < u.type.hits, // skip already-downed units
      );

      const adjacent = liveEnemies.filter(
        (e) => manhattanDistance(unit, e) === 1,
      );
      if (adjacent.length === 0) continue;

      let best = adjacent[0]!;
      let bestScore = -Infinity;
      for (const t of adjacent) {
        let s: number;
        if (config.targetPriority === "strongest") {
          s = t.type.hits - t.damage;
        } else if (config.targetPriority === "weakest") {
          s = scoreAttackTarget(
            unit,
            t,
            g,
            false,
            config.focusFire,
            meleeVpContext,
          );
        } else {
          s =
            scoreAttackTarget(
              unit,
              t,
              g,
              false,
              config.focusFire,
              meleeVpContext,
            ) -
            manhattanDistance(unit, t) * 0.01;
        }
        if (s > bestScore) {
          bestScore = s;
          best = t;
        }
      }

      dispatch(setActiveUnitId(unitId));
      dispatch(attack(best));
    }
  };

// ---------------------------------------------------------------------------
// Morale
// ---------------------------------------------------------------------------

export const aiMorale: Thunk = () => (dispatch, getState) => {
  const sides = selectAllSides(getState());
  const result = getMoraleStatus(sides);
  dispatch(rollMorale(result.type === "loser" ? result.side : undefined));
  dispatch(pass());
};
