export interface AiConfig {
  personality: string;
  holdBackIfDamaged: boolean;
  preferRanged: boolean;
  chargeRecklessly: boolean;
  targetPriority: "weakest" | "nearest" | "strongest";
  retreatThreshold: number;
  neverPassMelee: boolean;
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
  },
  defensive: {
    personality: "defensive",
    holdBackIfDamaged: true,
    preferRanged: true,
    chargeRecklessly: false,
    targetPriority: "weakest",
    retreatThreshold: 0.5,
    neverPassMelee: false,
  },
  berserker: {
    personality: "berserker",
    holdBackIfDamaged: false,
    preferRanged: false,
    chargeRecklessly: true,
    targetPriority: "strongest",
    retreatThreshold: 0,
    neverPassMelee: true,
  },
};
