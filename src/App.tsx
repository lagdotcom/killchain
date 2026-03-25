import { Provider } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { Sidebar } from "./components/Sidebar.js";
import { defaultSides, defaultUnits, generateTerrain } from "./sampleData.js";
import { setupBattleAction } from "./state/actions.js";
import { makeStore } from "./state/store.js";
import { terrainAdapter } from "./state/terrain.js";

const store = makeStore({
  terrain: terrainAdapter.getInitialState(undefined, generateTerrain()),
});

store.dispatch(setupBattleAction({ sides: defaultSides, units: defaultUnits }));

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
