import { useSelector } from "react-redux";

import type { Pixels } from "../flavours.js";
import { useMapTool } from "../hooks/useMapTool.js";
import { selectActiveUnitId, selectSideEntities } from "../state/selectors.js";
import type { UnitEntity } from "../state/units.js";
import { classnames } from "../tools.js";
import { armourAbbreviation, moraleColours } from "../ui.js";

interface UnitTokenBaseProps {
  x: number;
  y: number;
  colour: string;
  label: string;
  cs: Pixels;
  isActive?: boolean;
  /** Stroke colour for the main circle — defaults to white */
  stroke?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function UnitTokenBase({
  x,
  y,
  colour,
  label,
  cs,
  isActive = false,
  stroke = "white",
  onClick,
  children,
}: UnitTokenBaseProps) {
  const tool = useMapTool();
  const { x: cx, y: cy } = tool.getCentre(x, y);
  const radius = cs * 0.4;

  return (
    <g
      className={classnames("unitToken", { canSelect: !!onClick })}
      transform={`translate(${cx}, ${cy})`}
      onClick={onClick}
    >
      {isActive ? (
        <circle cx={0} cy={0} r={radius * 1.5} fill="#fff" opacity="0.3" />
      ) : (
        <circle cx={3} cy={3} r={radius} fill="#000" opacity="0.3" />
      )}

      {!!onClick && !isActive && (
        <circle
          className="selectableRing"
          cx={0}
          cy={0}
          r={radius + 5}
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
      )}

      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={colour}
        stroke={stroke}
        strokeWidth="3"
        opacity="0.8"
      />

      <text x={0} y={-4} fontSize={14} fontWeight="bold">
        {label}
      </text>

      {children}
    </g>
  );
}

interface UnitTokenProps {
  attackTargetNumber?: number | undefined;
  cellSize: Pixels;
  onClick: undefined | ((unit: UnitEntity) => void);
  unit: UnitEntity;
}

function UnitToken({
  attackTargetNumber,
  cellSize,
  onClick,
  unit,
}: UnitTokenProps) {
  const activeUnitId = useSelector(selectActiveUnitId);
  const sides = useSelector(selectSideEntities);

  const side = sides[unit.side];
  const sideColor = side?.colour ?? "black";
  const isActive = activeUnitId === unit.id;
  const moraleColor = moraleColours[unit.status];

  const label =
    unit.shortName ??
    unit.name
      .split(" ")
      .map((w) => w[0])
      .join("");

  const radius = cellSize * 0.4;
  const left = -radius + 4;
  const right = radius - 4;
  const top = -radius + 4;
  const bottom = radius - 4;

  return (
    <UnitTokenBase
      x={unit.x}
      y={unit.y}
      colour={sideColor}
      stroke={moraleColor}
      label={label}
      cs={cellSize}
      isActive={isActive}
      {...(onClick && {
        onClick: () => {
          onClick(unit);
        },
      })}
    >
      <circle
        cx={right}
        cy={top}
        r={9}
        fill={sideColor}
        stroke={moraleColor}
        strokeWidth="3"
      />
      <text x={right} y={top} fontSize={10}>
        {unit.type.hits - unit.damage}
      </text>

      <circle
        cx={left}
        cy={bottom}
        r={9}
        fill={sideColor}
        stroke={moraleColor}
        strokeWidth="3"
      />
      <text x={left} y={bottom} fontSize={10}>
        {armourAbbreviation[unit.type.armour]}
      </text>

      {unit.ready && (
        <text x={left} y={top}>
          ⭐
        </text>
      )}

      <text x={0} y={12}>
        {unit.type.mounted && "🐴"}
        {unit.missile && "🏹"}
      </text>

      {attackTargetNumber !== undefined && (
        <text x={0} y={radius + 14} fontSize={11} fill="#ffd">
          {attackTargetNumber}+
        </text>
      )}

      <title>{`${unit.name} (${unit.type.name}) - ${side?.name ?? "Unknown"}`}</title>
    </UnitTokenBase>
  );
}

export default UnitToken;
