import type { EntityId, EntityState } from "@reduxjs/toolkit";

export function* eachEntity<T, Id extends EntityId>(state: EntityState<T, Id>) {
  for (const id of state.ids) {
    const entity = state.entities[id];
    if (entity) yield entity;
  }
}
