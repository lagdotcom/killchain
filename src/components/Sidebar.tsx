import { useSelector } from "react-redux";

import { Phase } from "../killchain/rules.js";
import { pass } from "../state/actions.js";
import {
  selectActiveSide,
  selectCanPassNow,
  selectMap,
  selectPhase,
  selectTurn,
} from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";
import { InitiativePhase } from "./InitiativePhase.js";
import { MoralePhase } from "./MoralePhase.js";
import { PlacementPhase } from "./PlacementPhase.js";
import { SurprisePhase } from "./SurprisePhase.js";

interface SidebarProps {
  isEditingTerrain: boolean;
  onOpenMapManager: () => void;
  onToggleEditTerrain: () => void;
}

export function Sidebar({
  isEditingTerrain,
  onOpenMapManager,
  onToggleEditTerrain,
}: SidebarProps) {
  const dispatch = useAppDispatch();
  const canPass = useSelector(selectCanPassNow);
  const map = useSelector(selectMap);
  const side = useSelector(selectActiveSide);
  const phase = useSelector(selectPhase);
  const turn = useSelector(selectTurn);

  return (
    <div className="sidebar">
      <div className="map-section">
        <div className="map-section-info">
          <span className="map-name">{map?.name ?? map?.id ?? "No map"}</span>
          {map && (
            <span className="map-dims">
              {map.width}×{map.height}
            </span>
          )}
        </div>
        <div className="map-section-actions">
          <button
            className={isEditingTerrain ? "active" : ""}
            onClick={onToggleEditTerrain}
            title="Edit terrain"
          >
            ✏️
          </button>
          <button onClick={onOpenMapManager} title="Map manager">
            🗺️
          </button>
        </div>
      </div>

      <div className="main">
        <div className="turn-phase">
          {turn > 0 && <span>Turn {turn}, </span>}
          {Phase[phase]}
          {side && <span>, {side.name}</span>}
        </div>

        <div>
          <button
            disabled={!canPass}
            onClick={() => {
              dispatch(pass());
            }}
          >
            Pass
          </button>
        </div>

        {phase === Phase.Placement && <PlacementPhase />}
        {phase === Phase.Surprise && <SurprisePhase />}
        {phase === Phase.Initiative && <InitiativePhase />}
        {phase === Phase.Morale && <MoralePhase />}
      </div>
    </div>
  );
}
