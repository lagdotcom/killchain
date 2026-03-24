import { useSelector } from "react-redux";

import type { Pixels } from "../flavours.js";
import { selectBattle } from "../state/selectors.js";
import type { UnitState } from "../state/units.js";
import { moraleColours } from "../styles.js";

interface UnitTokenProps {
  unit: UnitState;
  cellSize: Pixels;
}

function UnitToken({ unit, cellSize }: UnitTokenProps) {
  const battle = useSelector(selectBattle);

  const cx = unit.x * cellSize + cellSize / 2;
  const cy = unit.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  const sideColor = battle.sides[unit.side]?.colour;
  const moraleColor = moraleColours[unit.status];

  const label = unit.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle cx={3} cy={3} r={radius} fill="#000" opacity="0.3" />

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
        cx={radius - 4}
        cy={-radius + 2}
        r={9}
        fill={sideColor}
        stroke={moraleColor}
        strokeWidth="3"
      />
      <text
        x={radius - 4}
        y={-radius + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill="#fff"
        pointerEvents="none"
      >
        {unit.type.hits - unit.damage}
      </text>

      <text
        x={0}
        y={radius - 4}
        textAnchor="middle"
        dominantBaseline="central"
        pointerEvents="none"
      >
        {unit.type.mounted && "🐴"}
        {unit.missile && "🏹"}
      </text>

      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fill="#fff"
        fontWeight="bold"
        pointerEvents="none"
      >
        {label}
      </text>

      <title>{`${unit.name} (${unit.type.name}) - ${battle.sides[unit.side]?.name}`}</title>
    </g>
  );
}

export default UnitToken;
