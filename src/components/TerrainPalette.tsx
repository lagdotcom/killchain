import type { TerrainType } from "../killchain/types.js";
import { terrainColours } from "../ui.js";

export type EditBrush =
  | { mode: "terrain"; type: TerrainType }
  | { mode: "elevate"; delta: 1 | -1 };

interface Props {
  brush: EditBrush;
  onBrushChange: (brush: EditBrush) => void;
  onDone: () => void;
}

const terrainTypes: TerrainType[] = ["Open", "Woods", "Marsh"];

export function TerrainPalette({ brush, onBrushChange, onDone }: Props) {
  return (
    <div className="terrain-palette">
      <span className="palette-label">Paint:</span>
      {terrainTypes.map((type) => (
        <button
          key={type}
          className={`palette-btn terrain-btn${brush.mode === "terrain" && brush.type === type ? " active" : ""}`}
          style={{ "--terrain-color": terrainColours[type] } as React.CSSProperties}
          onClick={() => onBrushChange({ mode: "terrain", type })}
          title={type}
        >
          {type}
        </button>
      ))}
      <span className="palette-label">Elev:</span>
      <button
        className={`palette-btn${brush.mode === "elevate" && brush.delta === 1 ? " active" : ""}`}
        onClick={() => onBrushChange({ mode: "elevate", delta: 1 })}
        title="Raise elevation"
      >
        ↑
      </button>
      <button
        className={`palette-btn${brush.mode === "elevate" && brush.delta === -1 ? " active" : ""}`}
        onClick={() => onBrushChange({ mode: "elevate", delta: -1 })}
        title="Lower elevation"
      >
        ↓
      </button>
      <button className="palette-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
