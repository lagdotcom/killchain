import { Provider } from "react-redux";

import GameGrid from "./components/GameGrid.js";
import { generateTerrain, getDefaultUnits } from "./sampleData.js";
import { makeStore } from "./state/store.js";
import { terrainAdapter } from "./state/terrain.js";
import { unitsAdapter } from "./state/units.js";

const store = makeStore({
  terrain: terrainAdapter.getInitialState(undefined, generateTerrain()),
  units: unitsAdapter.getInitialState(undefined, getDefaultUnits()),
});

function App() {
  return (
    <Provider store={store}>
      <div className="app">
        <GameGrid />
      </div>
    </Provider>
  );
}

export default App;
