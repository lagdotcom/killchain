import { memo } from "react";

import type { TerrainType } from "../../killchain/types.js";

function WoodsIcon() {
  return (
    <>
      <path className="woodsIcon" d="M20,55 v-15 a10 10 360 1 1 0.1,0" />
      <path className="woodsIcon" d="M45,45 v-15 a10 10 360 1 1 0.1,0" />
    </>
  );
}
const WoodsIconMemoized = memo(WoodsIcon);

function MarshIcon() {
  return (
    <>
      <path className="marshIcon" d="M32,32 m-15,9 l-15,-12" />
      <path className="marshIcon" d="M32,32 m-9,2 l-11,-17" />
      <path className="marshIcon" d="M32,32 l0,-22" />
      <path className="marshIcon" d="M32,32 m9,2 l11,-17" />
      <path className="marshIcon" d="M32,32 m15,9 l15,-12" />
    </>
  );
}
const MarshIconMemoized = memo(MarshIcon);

export function getTerrainIcon(type: TerrainType) {
  switch (type) {
    case "Woods":
      return <WoodsIconMemoized />;
    case "Marsh":
      return <MarshIconMemoized />;
  }
}
