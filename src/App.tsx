import { useRef } from "react";
import { Provider } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { MessageLog } from "./components/MessageLog.js";
import { Sidebar } from "./components/Sidebar.js";
import type { Cells } from "./flavours.js";
import { defaultSides, defaultUnits, generateTerrain } from "./sampleData.js";
import { setupBattleAction } from "./state/actions.js";
import { makeStore } from "./state/store.js";
import { terrainAdapter } from "./state/terrain.js";

const store = makeStore({
  terrain: terrainAdapter.getInitialState(undefined, generateTerrain()),
});

store.dispatch(setupBattleAction({ sides: defaultSides, units: defaultUnits }));

function App() {
  const panToCellRef = useRef<((x: Cells, y: Cells) => void) | null>(null);

  return (
    <Provider store={store}>
      <div className="app">
        <div className="app-main">
          <Sidebar />
          <GameGrid
            onRegisterPan={(fn) => {
              panToCellRef.current = fn;
            }}
          />
        </div>
        <MessageLog panToCell={(x, y) => panToCellRef.current?.(x, y)} />
      </div>
    </Provider>
  );
}

export default App;
