import { createContext, useContext } from "react";

import { MapTool } from "../geometry/tool.js";

export const MapToolContext = createContext({} as MapTool);

export const useMapTool = () => useContext(MapToolContext);
