import { useCallback, useState } from "react";
import { Provider, useSelector } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { MapManager } from "./components/MapManager.js";
import { MessageLog } from "./components/MessageLog.js";
import { RosterManager } from "./components/RosterManager.js";
import { Sidebar } from "./components/Sidebar.js";
import { TerrainPalette, type EditBrush } from "./components/TerrainPalette.js";
import type { Cells, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import {
  defaultDefinitions,
  defaultSides,
  defaultUnits,
  generateGridMap,
} from "./sampleData.js";
import { setupBattleAction } from "./state/actions.js";
import { mapsAdapter } from "./state/maps.js";
import { updateCell } from "./state/maps.js";
import { rosterAdapter } from "./state/roster.js";
import { selectMap } from "./state/selectors.js";
import { makeStore, useAppDispatch } from "./state/store.js";

const initialMap = generateGridMap("default", 10, 20, 20, undefined, "Default");
const store = makeStore({
  maps: mapsAdapter.getInitialState(undefined, [initialMap]),
  roster: rosterAdapter.getInitialState(undefined, defaultDefinitions),
});
store.dispatch(
  setupBattleAction({
    map: initialMap.id,
    sides: defaultSides,
    units: defaultUnits,
  }),
);

function AppContent() {
  const dispatch = useAppDispatch();
  const map = useSelector(selectMap);

  const [panToCellFn, setPanToCellFn] = useState<
    ((x: Cells, y: Cells) => void) | null
  >(null);
  const [showMapManager, setShowMapManager] = useState(false);
  const [showRosterManager, setShowRosterManager] = useState(false);
  const [editBrush, setEditBrush] = useState<EditBrush | null>(null);
  const [logHoverCell, setLogHoverCell] = useState<
    { x: Cells; y: Cells } | undefined
  >(undefined);

  const handleEditCell = useCallback(
    (x: Cells, y: Cells) => {
      if (!editBrush || !map) return;
      const cellId = xyId(x, y) as TerrainId;
      const cell = map.cells.entities[cellId];
      if (!cell) return;

      if (editBrush.mode === "terrain") {
        dispatch(updateCell({ mapId: map.id, cellId, changes: { type: editBrush.type } }));
      } else {
        const newElevation = Math.max(0, Math.min(3, cell.elevation + editBrush.delta));
        dispatch(updateCell({ mapId: map.id, cellId, changes: { elevation: newElevation } }));
      }
    },
    [dispatch, editBrush, map],
  );

  return (
    <div className="app">
      <div className="app-main">
        <Sidebar
          onOpenMapManager={() => setShowMapManager(true)}
          onOpenRosterManager={() => setShowRosterManager(true)}
          onToggleEditTerrain={() =>
            setEditBrush((b) =>
              b ? null : { mode: "terrain", type: "Open" },
            )
          }
          isEditingTerrain={editBrush !== null}
        />
        <div className="map-container">
          {editBrush && (
            <TerrainPalette
              brush={editBrush}
              onBrushChange={setEditBrush}
              onDone={() => setEditBrush(null)}
            />
          )}
          <GameGrid
            onRegisterPan={(fn) => setPanToCellFn(() => fn)}
            onEditCell={editBrush ? handleEditCell : undefined}
            logHoverCell={logHoverCell}
          />
        </div>
      </div>
      <MessageLog
        panToCell={(x, y) => panToCellFn?.(x, y)}
        onHoverCell={(x, y) => setLogHoverCell({ x, y })}
        onUnhoverCell={() => setLogHoverCell(undefined)}
      />
      {showMapManager && (
        <MapManager onClose={() => setShowMapManager(false)} />
      )}
      {showRosterManager && (
        <RosterManager onClose={() => setShowRosterManager(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
