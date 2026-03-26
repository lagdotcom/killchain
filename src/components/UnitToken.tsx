import { useSelector } from "react-redux";

import type { Pixels } from "../flavours.js";
import { selectActiveUnitId, selectSideEntities } from "../state/selectors.js";
import type { UnitEntity } from "../state/units.js";
import { classnames } from "../tools.js";
import { armourAbbreviation, moraleColours } from "../ui.js";

interface UnitTokenProps {
  cellSize: Pixels;
  onClick: undefined | ((unit: UnitEntity) => void);
  unit: UnitEntity;
}

function UnitToken({ cellSize, onClick, unit }: UnitTokenProps) {
  const activeUnitId = useSelector(selectActiveUnitId);
  const sides = useSelector(selectSideEntities);

  const side = sides[unit.side];
  const sideColor = side?.colour ?? "black";

  const cx = unit.x * cellSize + cellSize / 2;
  const cy = unit.y * cellSize + cellSize / 2;

  const radius = cellSize * 0.4;
  const left = -radius + 4;
  const right = radius - 4;
  const top = -radius + 4;
  const bottom = radius - 4;

  const moraleColor = moraleColours[unit.status];

  const label = unit.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <g
      className={classnames("unitToken", { canSelect: !!onClick })}
      transform={`translate(${cx}, ${cy})`}
      onClick={() => onClick?.(unit)}
    >
      {activeUnitId === unit.id ? (
        <circle cx={0} cy={0} r={radius * 1.5} fill="#fff" opacity="0.3" />
      ) : (
        <circle cx={3} cy={3} r={radius} fill="#000" opacity="0.3" />
      )}

      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={sideColor}
        stroke={moraleColor}
        strokeWidth="3"
        opacity="0.8"
      />

      <circle
        cx={right}
        cy={top}
        r={9}
        fill={sideColor}
        stroke={moraleColor}
        strokeWidth="3"
      />
      <text
        x={right}
        y={top}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill="#fff"
        pointerEvents="none"
      >
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
      <text
        x={left}
        y={bottom}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill="#fff"
        pointerEvents="none"
      >
        {armourAbbreviation[unit.type.armour]}
      </text>

      <text
        x={0}
        y={12}
        textAnchor="middle"
        dominantBaseline="central"
        pointerEvents="none"
      >
        {unit.type.mounted && "🐴"}
        {unit.missile && "🏹"}
      </text>

      <text
        x={0}
        y={-4}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fill="#fff"
        fontWeight="bold"
        pointerEvents="none"
      >
        {label}
      </text>

      <title>{`${unit.name} (${unit.type.name}) - ${side?.name ?? "Unknown"}`}</title>
    </g>
  );
}

export default UnitToken;
