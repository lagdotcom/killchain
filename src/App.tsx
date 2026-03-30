import { useRef } from "react";
import { Provider } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { MessageLog } from "./components/MessageLog.js";
import { Sidebar } from "./components/Sidebar.js";
import type { Cells } from "./flavours.js";
import { defaultSides, defaultUnits, generateGridMap } from "./sampleData.js";
import { setupBattleAction } from "./state/actions.js";
import { mapsAdapter } from "./state/maps.js";
import { makeStore } from "./state/store.js";

const map = generateGridMap("test", 10, 20, 20);
const store = makeStore({
  maps: mapsAdapter.getInitialState(undefined, [map]),
});
store.dispatch(
  setupBattleAction({ map: map.id, sides: defaultSides, units: defaultUnits }),
);

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
