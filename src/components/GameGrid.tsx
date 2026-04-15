import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import type { Cells, Feet, SideId, UnitId } from "../flavours.js";
import { usePanZoom } from "../hooks/usePanZoom.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import {
  applyAttackModifiers,
  getAttackModifiers,
  longRangeMax,
  Phase,
} from "../killchain/rules.js";
import { KillChainEngine } from "../KillChainEngine.js";
import { getDeploymentZoneTints, getTints, isInDeploymentZone } from "../logic.js";
import { attack, moveAction, placeUnitAction } from "../state/actions.js";
import { setActiveUnitId } from "../state/battle.js";
import {
  selectActiveSide,
  selectActiveUnit,
  selectMap,
  selectPhase,
  selectPlacedUnits,
  selectSideEntities,
  selectUnitEntities,
} from "../state/selectors.js";
import type { SideEntity } from "../state/sides.js";
import { useAppDispatch } from "../state/store.js";
import type { TerrainEntity } from "../state/terrain.js";
import type { UnitEntity } from "../state/units.js";
import { enumerate, manhattanDistance } from "../tools.js";
import { cellSize } from "../ui.js";
import { GridOverlay } from "./GridOverlay.js";
import TerrainCell, { type TerrainCellProps } from "./TerrainCell.js";
import UnitToken from "./UnitToken.js";

function getTerrainCells(
  width: Cells,
  height: Cells,
  getTerrain: (x: Cells, y: Cells, e: number) => TerrainEntity,
  onClick?: TerrainCellProps["onClick"],
  onDrop?: TerrainCellProps["onDrop"],
) {
  return enumerate(height)
    .flatMap((y) => enumerate(width).map((x) => getTerrain(x, y, -1)))
    .map((data) => (
      <TerrainCell
        key={data.id}
        x={data.x}
        y={data.y}
        terrain={data}
        north={getTerrain(data.x, data.y - 1, data.elevation)}
        south={getTerrain(data.x, data.y + 1, data.elevation)}
        east={getTerrain(data.x + 1, data.y, data.elevation)}
        west={getTerrain(data.x - 1, data.y, data.elevation)}
        onClick={onClick}
        onDrop={onDrop}
      />
    ));
}

function canAttack(
  unit: UnitEntity,
  side: SideEntity | undefined,
  phase: Phase,
) {
  if (!unit.ready) return false;
  if (unit.side !== side?.id) return false;

  if (!unit.missile) return phase === Phase.Melee;
  return phase === Phase.Missile || phase === Phase.Melee;
}

function canAttackTarget(
  attacker: UnitEntity | undefined,
  target: UnitEntity,
  phase: Phase,
  cellSize: Feet,
) {
  if (!attacker) return false;
  if (phase !== Phase.Missile && phase !== Phase.Melee) return false;

  const minRange: Cells = phase === Phase.Missile ? 2 : 1;
  const maxRange: Cells = attacker.missile ? longRangeMax / cellSize : 1;
  const distance = manhattanDistance(attacker, target);

  return (
    attacker.ready &&
    attacker.side !== target.side &&
    distance >= minRange &&
    distance <= maxRange
  );
}

function canMove(unit: UnitEntity, side: SideEntity | undefined, phase: Phase) {
  return (
    phase === Phase.Move &&
    unit.side === side?.id &&
    unit.moved < unit.type.move
  );
}

interface GameGridProps {
  onRegisterPan?: (fn: (x: Cells, y: Cells) => void) => void;
  onEditCell?: ((x: Cells, y: Cells) => void) | undefined;
  logHoverCell?: { x: Cells; y: Cells } | undefined;
}

function GameGrid({ onRegisterPan, onEditCell, logHoverCell }: GameGridProps) {
  const dispatch = useAppDispatch();
  const activeSide = useSelector(selectActiveSide);
  const activeUnit = useSelector(selectActiveUnit);
  const phase = useSelector(selectPhase);
  const sides = useSelector(selectSideEntities);
  const map = useSelector(selectMap);
  const units = useSelector(selectUnitEntities);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const { centre, gotoCell } = usePanZoom(svgRef, gRef);

  const placedUnits = useSelector(selectPlacedUnits);

  const handleDrop = useCallback(
    (x: Cells, y: Cells, unitId: UnitId, sideId: SideId) => {
      const side = sides[sideId];
      if (!side) return;
      if (side.deploymentZone && !isInDeploymentZone(side.deploymentZone, x, y))
        return;
      dispatch(placeUnitAction({ side, unit: units[unitId]!, x, y }));
    },
    [dispatch, sides, units],
  );

  const getTerrain = useCallback(
    (x: Cells, y: Cells, defaultElevation: number = 0): TerrainEntity =>
      map?.cells.entities[xyId(x, y)] ?? {
        id: xyId(x, y),
        x,
        y,
        type: "Open",
        elevation: defaultElevation,
      },
    [map],
  );

  const canSelect = useCallback(
    (unit: UnitEntity) => {
      return (
        canMove(unit, activeSide, phase) ||
        canAttack(unit, activeSide, phase) ||
        (map && canAttackTarget(activeUnit, unit, phase, map.cellSize))
      );
    },
    [activeSide, activeUnit, map, phase],
  );

  const tints = useMemo(() => {
    const movement = map ? getTints(activeUnit, phase, map, units) : [];
    if (phase === Phase.Placement && activeSide?.deploymentZone)
      return [...getDeploymentZoneTints(activeSide.deploymentZone), ...movement];
    return movement;
  }, [activeSide, activeUnit, map, phase, units]);

  const targetNumbers = useMemo(() => {
    if (!activeUnit || !map) return {};
    if (phase !== Phase.Missile && phase !== Phase.Melee) return {};
    const missile = phase === Phase.Missile && !!activeUnit.missile;
    const g = new KillChainEngine(map, units);
    return Object.fromEntries(
      placedUnits
        .filter((u) => canAttackTarget(activeUnit, u, phase, map.cellSize))
        .map((u) => [
          u.id,
          applyAttackModifiers(getAttackModifiers(g, missile, activeUnit, u)),
        ]),
    );
  }, [activeUnit, map, phase, placedUnits, units]);

  const handleClickTerrain = useCallback(
    (x: Cells, y: Cells) => {
      if (onEditCell) {
        onEditCell(x, y);
        return;
      }

      const tint = tints.find((t) => t.x === x && t.y === y);

      switch (phase) {
        case Phase.Move:
          if (activeUnit && tint?.reason === "reachable")
            return dispatch(
              moveAction({ unit: activeUnit, x, y, cost: tint.cost }),
            );
      }

      dispatch(setActiveUnitId(undefined));
    },
    [activeUnit, dispatch, onEditCell, phase, tints],
  );

  const handleClickUnit = useCallback(
    (unit: UnitEntity) => {
      switch (phase) {
        case Phase.Missile:
        case Phase.Melee:
          if (map && canAttackTarget(activeUnit, unit, phase, map.cellSize)) {
            dispatch(attack(unit));
            return;
          }
      }

      // Only units that can act as initiators (move or attack) may become the
      // active unit. Attack targets have onClick for cursor feedback but must
      // not be selectable as initiators — doing so lets the player control
      // enemy units.
      if (
        canMove(unit, activeSide, phase) ||
        canAttack(unit, activeSide, phase)
      ) {
        dispatch(
          setActiveUnitId(activeUnit?.id === unit.id ? undefined : unit.id),
        );
      } else {
        dispatch(setActiveUnitId(undefined));
      }
    },
    [activeSide, activeUnit, dispatch, map, phase],
  );

  const terrainCells = useMemo(
    () =>
      map
        ? getTerrainCells(
            map.width,
            map.height,
            getTerrain,
            handleClickTerrain,
            handleDrop,
          )
        : [],
    [getTerrain, handleClickTerrain, handleDrop, map],
  );

  useEffect(() => {
    centre();
    onRegisterPan?.(gotoCell);
  }, [centre, gotoCell, onRegisterPan]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      className={`map${onEditCell ? " editMode" : ""}`}
    >
      <g ref={gRef}>
        {terrainCells}
        {placedUnits.map((unit) => (
          <UnitToken
            key={unit.id}
            unit={unit}
            cellSize={cellSize}
            attackTargetNumber={targetNumbers[unit.id]}
            onClick={canSelect(unit) ? handleClickUnit : undefined}
          />
        ))}
        <GridOverlay tints={tints} logHoverCell={logHoverCell} />
      </g>
    </svg>
  );
}

export default GameGrid;
