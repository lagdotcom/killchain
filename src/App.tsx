import { Provider } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { Sidebar } from "./components/Sidebar.js";
import { defaultSides, defaultUnits, generateTerrain } from "./sampleData.js";
import { startPlacement } from "./state/battle.js";
import { makeStore } from "./state/store.js";
import { terrainAdapter } from "./state/terrain.js";
import { unitsAdapter } from "./state/units.js";

const store = makeStore({
  terrain: terrainAdapter.getInitialState(undefined, generateTerrain()),
  units: unitsAdapter.getInitialState(undefined, defaultUnits),
});

store.dispatch(startPlacement(defaultSides));

function App() {
  return (
    <Provider store={store}>
      <div className="app">
        <Sidebar />
        <GameGrid />
      </div>
    </Provider>
  );
}

export default App;
