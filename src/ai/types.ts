export type { AiPersonality } from "../state/sides.js";

export interface AiConfig {
  personality: string;
  holdBackIfDamaged: boolean;
  preferRanged: boolean;
  chargeRecklessly: boolean;
  targetPriority: "weakest" | "nearest" | "strongest";
  retreatThreshold: number;
  neverPassMelee: boolean;
  seekHighGround: boolean;
  focusFire: boolean;
  missilePriority: "weakest" | "nearest" | "strongest";
  avoidDifficultTerrain: boolean;
}

export const AI_CONFIGS: Record<string, AiConfig> = {
  aggressive: {
    personality: "aggressive",
    holdBackIfDamaged: false,
    preferRanged: false,
    chargeRecklessly: true,
    targetPriority: "nearest",
    retreatThreshold: 0,
    neverPassMelee: false,
    seekHighGround: false,
    focusFire: false,
    missilePriority: "nearest",
    avoidDifficultTerrain: false,
  },
  defensive: {
    personality: "defensive",
    holdBackIfDamaged: true,
    preferRanged: true,
    chargeRecklessly: false,
    targetPriority: "weakest",
    retreatThreshold: 0.5,
    neverPassMelee: false,
    seekHighGround: false,
    focusFire: false,
    missilePriority: "nearest",
    avoidDifficultTerrain: false,
  },
  berserker: {
    personality: "berserker",
    holdBackIfDamaged: false,
    preferRanged: false,
    chargeRecklessly: true,
    targetPriority: "strongest",
    retreatThreshold: 0,
    neverPassMelee: true,
    seekHighGround: false,
    focusFire: false,
    missilePriority: "nearest",
    avoidDifficultTerrain: false,
  },
  tactical: {
    personality: "tactical",
    holdBackIfDamaged: false,
    preferRanged: false,
    chargeRecklessly: false,
    targetPriority: "weakest",
    retreatThreshold: 0.4,
    neverPassMelee: false,
    seekHighGround: true,
    focusFire: true,
    missilePriority: "weakest",
    avoidDifficultTerrain: true,
  },
  skirmisher: {
    personality: "skirmisher",
    holdBackIfDamaged: true,
    preferRanged: true,
    chargeRecklessly: false,
    targetPriority: "nearest",
    retreatThreshold: 0.25,
    neverPassMelee: false,
    seekHighGround: false,
    focusFire: false,
    missilePriority: "weakest",
    avoidDifficultTerrain: false,
  },
};
