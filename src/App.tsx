import { useCallback, useState } from "react";
import { useAiPlayer } from "./hooks/useAiPlayer.js";
import { Provider, useSelector } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { MapManager } from "./components/MapManager.js";
import { MessageLog } from "./components/MessageLog.js";
import { RosterManager } from "./components/RosterManager.js";
import { ScenarioManager } from "./components/ScenarioManager.js";
import { Sidebar } from "./components/Sidebar.js";
import { type EditBrush, TerrainPalette } from "./components/TerrainPalette.js";
import type { Cells, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import {
  defaultDefinitions,
  defaultScenario,
  defaultSides,
  defaultUnits,
  generateGridMap,
} from "./sampleData.js";
import { setupBattleAction } from "./state/actions.js";
import { mapsAdapter } from "./state/maps.js";
import { updateCell } from "./state/maps.js";
import { loadPersistedState, persistState } from "./state/persistence.js";
import { rosterAdapter } from "./state/roster.js";
import { scenariosAdapter } from "./state/scenarios.js";
import { selectMap } from "./state/selectors.js";
import { makeStore, useAppDispatch } from "./state/store.js";

type AppView = "game" | "maps" | "roster" | "scenarios";

const initialMap = generateGridMap("default", 10, 20, 20, undefined, "Default");
const persisted = loadPersistedState();
const store = makeStore({
  maps: persisted?.maps ?? mapsAdapter.getInitialState(undefined, [initialMap]),
  roster:
    persisted?.roster ??
    rosterAdapter.getInitialState(undefined, defaultDefinitions),
  scenarios:
    persisted?.scenarios ??
    scenariosAdapter.getInitialState(undefined, [defaultScenario]),
});
store.subscribe(() => {
  persistState(store.getState());
});
if (!persisted) {
  store.dispatch(
    setupBattleAction({
      map: initialMap.id,
      sides: defaultSides,
      units: defaultUnits,
    }),
  );
}

function AppContent() {
  const dispatch = useAppDispatch();
  const map = useSelector(selectMap);
  useAiPlayer();

  const [panToCellFn, setPanToCellFn] = useState<
    ((x: Cells, y: Cells) => void) | null
  >(null);
  const [view, setView] = useState<AppView>("game");
  const onBack = () => {
    setView("game");
  };
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
        dispatch(
          updateCell({
            mapId: map.id,
            cellId,
            changes: { type: editBrush.type },
          }),
        );
      } else {
        const newElevation = Math.max(
          0,
          Math.min(3, cell.elevation + editBrush.delta),
        );
        dispatch(
          updateCell({
            mapId: map.id,
            cellId,
            changes: { elevation: newElevation },
          }),
        );
      }
    },
    [dispatch, editBrush, map],
  );

  return (
    <div className="app">
      {view !== "game" ? (
        view === "maps" ? (
          <MapManager onClose={onBack} />
        ) : view === "roster" ? (
          <RosterManager onClose={onBack} />
        ) : (
          <ScenarioManager onClose={onBack} />
        )
      ) : (
        <>
          <div className="app-main">
            <Sidebar
              onOpenMapManager={() => {
                setView("maps");
              }}
              onOpenRosterManager={() => {
                setView("roster");
              }}
              onOpenScenarioManager={() => {
                setView("scenarios");
              }}
              onToggleEditTerrain={() => {
                setEditBrush((b) =>
                  b ? null : { mode: "terrain", type: "Open" },
                );
              }}
              isEditingTerrain={editBrush !== null}
            />
            <div className="map-container">
              {editBrush && (
                <TerrainPalette
                  brush={editBrush}
                  onBrushChange={setEditBrush}
                  onDone={() => {
                    setEditBrush(null);
                  }}
                />
              )}
              <GameGrid
                onRegisterPan={(fn) => {
                  setPanToCellFn(() => fn);
                }}
                onEditCell={editBrush ? handleEditCell : undefined}
                logHoverCell={logHoverCell}
              />
            </div>
          </div>
          <MessageLog
            panToCell={(x, y) => panToCellFn?.(x, y)}
            onHoverCell={(x, y) => {
              setLogHoverCell({ x, y });
            }}
            onUnhoverCell={() => {
              setLogHoverCell(undefined);
            }}
          />
        </>
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
