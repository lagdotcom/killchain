import type { Action, ActionCreator, ThunkAction } from "@reduxjs/toolkit";

import type { Cells } from "../flavours.js";
import { xyId } from "../killchain/EuclideanEngine.js";
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
import type { AppState } from "../state/store.js";
import { manhattanDistance } from "../tools.js";
import { scoreAttackTarget, scoreMoveCell, scorePlacementCell } from "./scoring.js";
import type { AiConfig } from "./types.js";

type Thunk<T = void> = ActionCreator<ThunkAction<T, AppState, void, Action>>;

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export const aiPlacement: Thunk =
  (side: SideEntity, _config: AiConfig) => (dispatch, getState) => {
    const state = getState();
    const map = selectMap(state);
    if (!map) return;

    const sideEntity = selectSideEntities(state)[side.id];
    if (!sideEntity || sideEntity.unplacedIds.length === 0) {
      dispatch(pass());
      return;
    }

    const unitId = sideEntity.unplacedIds[0];
    const allUnits = selectAllUnits(state);
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return;

    const zone = sideEntity.deploymentZone;
    const placedPositions = allUnits
      .filter((u) => !isNaN(u.x))
      .map((u) => ({ x: u.x, y: u.y }));
    const occupiedIds = new Set(
      placedPositions.map((p) => xyId(p.x as Cells, p.y as Cells)),
    );

    const candidates: { x: Cells; y: Cells }[] = [];
    for (const cell of Object.values(map.cells.entities)) {
      if (!cell) continue;
      if (occupiedIds.has(cell.id)) continue;
      if (zone && !isInDeploymentZone(zone, cell.x, cell.y)) continue;
      if (!zone) {
        const usesTop = (side.id as number) % 2 === 0;
        if (usesTop && cell.y >= Math.floor(map.height / 3)) continue;
        if (!usesTop && cell.y < Math.ceil((2 * map.height) / 3)) continue;
      }
      candidates.push({ x: cell.x, y: cell.y });
    }

    if (candidates.length === 0) return;

    let best: { x: Cells; y: Cells } | undefined;
    let bestScore = -Infinity;
    for (const cell of candidates) {
      const s = scorePlacementCell(cell, zone, unit, placedPositions, map);
      if (s > bestScore) {
        bestScore = s;
        best = cell;
      }
    }

    if (!best) return;
    dispatch(placeUnitAction({ side: sideEntity, unit, x: best.x, y: best.y }));

    // If all sides have now placed all units, advance the phase.
    if (selectBattle(getState()).canPass) dispatch(pass());
  };

// ---------------------------------------------------------------------------
// Missile
// ---------------------------------------------------------------------------

export const aiMissile: Thunk =
  (side: SideEntity, _config: AiConfig) => (dispatch, getState) => {
    const state = getState();
    const map = selectMap(state);
    if (!map) return;

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
      const g = new KillChainEngine(map, unitEntities);

      const targets = liveUnits.filter((e) => {
        if (e.side === side.id || e.status === "Rout" || isNaN(e.x)) return false;
        if (e.damage >= e.type.hits) return false; // already destroyed
        const dist = manhattanDistance(unit, e) * map.cellSize;
        return dist > map.cellSize && dist <= longRangeMax;
      });
      if (targets.length === 0) continue;

      let best = targets[0]!;
      let bestScore = -Infinity;
      for (const t of targets) {
        const s = scoreAttackTarget(unit, t, g, true);
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
          u.status === "Normal" &&
          !isNaN(u.x) &&
          u.moved < u.type.move,
      )
      .map((u) => u.id);

    for (const unitId of myUnitIds) {
      // Re-read state to get up-to-date positions after previous moves.
      const unitEntities = selectUnitEntities(getState());
      const unit = unitEntities[unitId];
      if (!unit || unit.moved >= unit.type.move) continue;

      const liveEnemies = selectAllUnits(getState()).filter(
        (u) => u.side !== side.id && u.status !== "Rout" && !isNaN(u.x),
      );

      const retreating =
        underPressure || (config.holdBackIfDamaged && unit.damage > 0);

      const skipAdvance =
        !config.chargeRecklessly &&
        config.preferRanged &&
        unit.missile &&
        !retreating;

      if (skipAdvance && liveEnemies.every((e) => manhattanDistance(unit, e) > 1))
        continue;

      const effectiveConfig = retreating
        ? { ...config, holdBackIfDamaged: true }
        : config;

      const score = (cell: { x: Cells; y: Cells }) =>
        scoreMoveCell(cell, liveEnemies, effectiveConfig, unit);

      const best = findBestMove(unit, unitEntities, map, score);
      if (!best) continue;

      // Don't advance if standing still scores better (avoids pointless shuffling).
      if (!retreating && !config.chargeRecklessly) {
        const currentScore = scoreMoveCell(
          { x: unit.x, y: unit.y },
          liveEnemies,
          config,
          unit,
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

    const myUnitIds = selectAllUnits(getState())
      .filter((u) => u.side === side.id && u.ready && !isNaN(u.x))
      .map((u) => u.id);

    for (const unitId of myUnitIds) {
      const unitEntities = selectUnitEntities(getState());
      const unit = unitEntities[unitId];
      if (!unit || !unit.ready) continue;

      const g = new KillChainEngine(map, unitEntities);

      const liveEnemies = selectAllUnits(getState()).filter(
        (u) =>
          u.side !== side.id &&
          u.status !== "Rout" &&
          !isNaN(u.x) &&
          u.damage < u.type.hits, // skip already-downed units
      );

      const adjacent = liveEnemies.filter((e) => manhattanDistance(unit, e) === 1);
      if (adjacent.length === 0) continue;

      let best = adjacent[0]!;
      let bestScore = -Infinity;
      for (const t of adjacent) {
        let s: number;
        if (config.targetPriority === "strongest") {
          s = t.type.hits - t.damage;
        } else if (config.targetPriority === "weakest") {
          s = scoreAttackTarget(unit, t, g, false);
        } else {
          s =
            scoreAttackTarget(unit, t, g, false) -
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
  const state = getState();
  const battle = selectBattle(state);
  if (!battle.canPass) {
    const sides = selectAllSides(state);
    const result = getMoraleStatus(sides);
    dispatch(rollMorale(result.type === "loser" ? result.side : undefined));
  }
  dispatch(pass());
};
