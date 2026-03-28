import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import type { Cells, SideId, UnitId } from "../flavours.js";
import { usePanZoom } from "../hooks/usePanZoom.js";
import { xyId } from "../killchain/EuclideanEngine.js";
import { Phase } from "../killchain/rules.js";
import { getTints } from "../logic.js";
import { attack, moveAction, placeUnitAction } from "../state/actions.js";
import { setActiveUnitId } from "../state/battle.js";
import {
  selectActiveSide,
  selectActiveUnit,
  selectAllSides,
  selectPhase,
  selectPlacedUnits,
  selectTerrainEntities,
  selectUnitEntities,
} from "../state/selectors.js";
import type { SideEntity } from "../state/sides.js";
import { useAppDispatch } from "../state/store.js";
import type { TerrainEntity } from "../state/terrain.js";
import type { UnitEntity } from "../state/units.js";
import { enumerate, manhattanDistance } from "../tools.js";
import { cellSize, mapHeight, mapWidth } from "../ui.js";
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
) {
  if (!attacker) return false;

  const minRange = phase === Phase.Missile ? 2 : 1;
  const maxRange = attacker.missile ? 15 : 1;
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
}

function GameGrid({ onRegisterPan }: GameGridProps) {
  const dispatch = useAppDispatch();
  const activeSide = useSelector(selectActiveSide);
  const activeUnit = useSelector(selectActiveUnit);
  const phase = useSelector(selectPhase);
  const sides = useSelector(selectAllSides);
  const terrain = useSelector(selectTerrainEntities);
  const units = useSelector(selectUnitEntities);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const { goto, panToCell } = usePanZoom(svgRef, gRef);

  const placedUnits = useSelector(selectPlacedUnits);

  const handleDrop = useCallback(
    (x: Cells, y: Cells, unitId: UnitId, sideId: SideId) => {
      dispatch(
        placeUnitAction({ side: sides[sideId]!, unit: units[unitId]!, x, y }),
      );
    },
    [dispatch, sides, units],
  );

  const getTerrain = useCallback(
    (x: Cells, y: Cells, defaultElevation: number = 0): TerrainEntity =>
      terrain[xyId(x, y)] ?? {
        id: xyId(x, y),
        x,
        y,
        type: "Open",
        elevation: defaultElevation,
      },
    [terrain],
  );

  const canSelect = useCallback(
    (unit: UnitEntity) => {
      return (
        canMove(unit, activeSide, phase) ||
        canAttack(unit, activeSide, phase) ||
        canAttackTarget(activeUnit, unit, phase)
      );
    },
    [activeSide, activeUnit, phase],
  );

  const tints = useMemo(
    () => getTints(activeUnit, phase, terrain, units),
    [activeUnit, phase, terrain, units],
  );

  const handleClickTerrain = useCallback(
    (x: Cells, y: Cells) => {
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
    [activeUnit, dispatch, phase, tints],
  );

  const handleClickUnit = useCallback(
    (unit: UnitEntity) => {
      switch (phase) {
        case Phase.Missile:
        case Phase.Melee:
          if (canAttackTarget(activeUnit, unit, phase))
            return dispatch(attack(unit));
      }

      // Only units that can act as initiators (move or attack) may become the
      // active unit. Attack targets have onClick for cursor feedback but must
      // not be selectable as initiators — doing so lets the player control
      // enemy units.
      if (canMove(unit, activeSide, phase) || canAttack(unit, activeSide, phase)) {
        dispatch(
          setActiveUnitId(activeUnit?.id === unit.id ? undefined : unit.id),
        );
      } else {
        dispatch(setActiveUnitId(undefined));
      }
    },
    [activeSide, activeUnit, dispatch, phase],
  );

  const terrainCells = useMemo(
    () =>
      getTerrainCells(
        mapWidth,
        mapHeight,
        getTerrain,
        handleClickTerrain,
        handleDrop,
      ),
    [getTerrain, handleClickTerrain, handleDrop],
  );

  // centre map on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const mapW = mapWidth * cellSize;
      const mapH = mapHeight * cellSize;
      const offsetX = (rect.width - mapW) / 2;
      const offsetY = (rect.height - mapH) / 2;
      goto(offsetX, offsetY);
    }
    onRegisterPan?.(panToCell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg ref={svgRef} width="100%" height="100%" className="map">
      <g ref={gRef}>
        {terrainCells}
        {placedUnits.map((unit) => (
          <UnitToken
            key={unit.id}
            unit={unit}
            cellSize={cellSize}
            onClick={canSelect(unit) ? handleClickUnit : undefined}
          />
        ))}
        <GridOverlay tints={tints} />
      </g>
    </svg>
  );
}

export default GameGrid;
