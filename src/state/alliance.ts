import type { SideId } from "../flavours.js";
import type { SideEntity } from "./sides.js";

/** True when two distinct sides share the same alliance group. */
export function isAlly(
  sideAId: SideId,
  sideBId: SideId,
  sideEntities: Partial<Record<SideId, SideEntity>>,
): boolean {
  if (sideAId === sideBId) return false;
  const a = sideEntities[sideAId];
  const b = sideEntities[sideBId];
  return a?.allianceId !== undefined && a.allianceId === b?.allianceId;
}

/** True when two sides are distinct and not allied. */
export function isEnemy(
  sideAId: SideId,
  sideBId: SideId,
  sideEntities: Partial<Record<SideId, SideEntity>>,
): boolean {
  return sideAId !== sideBId && !isAlly(sideAId, sideBId, sideEntities);
}
