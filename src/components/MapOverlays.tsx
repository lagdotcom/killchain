import type { DeploymentZone } from "../killchain/types.js";

export interface ZoneInfo {
  key: string;
  colour: string;
  zone: DeploymentZone;
}

export function ZoneOverlay({ zones, cs }: { zones: ZoneInfo[]; cs: number }) {
  return (
    <g>
      {zones.map((z) => (
        <rect
          key={z.key}
          x={z.zone.x * cs}
          y={z.zone.y * cs}
          width={z.zone.width * cs}
          height={z.zone.height * cs}
          fill={z.colour}
          fillOpacity={0.25}
          stroke={z.colour}
          strokeWidth={1}
          strokeOpacity={0.6}
          pointerEvents="none"
        />
      ))}
    </g>
  );
}

export function CellHighlight({
  x,
  y,
  cs,
  stroke = "white",
}: {
  x: number;
  y: number;
  cs: number;
  stroke?: string;
}) {
  return (
    <rect
      x={x * cs}
      y={y * cs}
      width={cs}
      height={cs}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      pointerEvents="none"
    />
  );
}
