import { describe, expect, test } from "vitest";

import type { SideId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import {
  defaultBattleState,
  makeGridMap,
  makeSide,
  makeUnit,
} from "../testHelpers.js";
import { rollMorale } from "./actions.js";
import { isAlly, isEnemy } from "./alliance.js";
import { mapsAdapter } from "./maps.js";
import { selectPhase } from "./selectors.js";
import type { SideEntity } from "./sides.js";
import { sidesAdapter } from "./sides.js";
import { makeStore } from "./store.js";
import type { UnitEntity } from "./units.js";
import { unitsAdapter } from "./units.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sideMap(...sides: SideEntity[]): Partial<Record<SideId, SideEntity>> {
  return Object.fromEntries(sides.map((s) => [s.id, s])) as Partial<
    Record<SideId, SideEntity>
  >;
}

const testMap = makeGridMap(10, 10);

function makeStoreWith(units: UnitEntity[], sides: SideEntity[]) {
  return makeStore({
    battle: { ...defaultBattleState, phase: Phase.Morale, mapId: testMap.id },
    maps: mapsAdapter.setAll(mapsAdapter.getInitialState(), [testMap]),
    sides: sidesAdapter.setAll(sidesAdapter.getInitialState(), sides),
    units: unitsAdapter.setAll(unitsAdapter.getInitialState(), units),
  });
}

// ---------------------------------------------------------------------------
// isAlly
// ---------------------------------------------------------------------------

describe("isAlly", () => {
  test("returns false for the same side", () => {
    expect(isAlly(0, 0, sideMap(makeSide(0, { allianceId: 1 })))).toBe(false);
  });

  test("returns true when both sides share the same allianceId", () => {
    const sides = sideMap(
      makeSide(0, { allianceId: 1 }),
      makeSide(1, { allianceId: 1 }),
    );
    expect(isAlly(0, 1, sides)).toBe(true);
  });

  test("returns false when allianceIds differ", () => {
    const sides = sideMap(
      makeSide(0, { allianceId: 1 }),
      makeSide(1, { allianceId: 2 }),
    );
    expect(isAlly(0, 1, sides)).toBe(false);
  });

  test("returns false when one side has no allianceId", () => {
    const sides = sideMap(makeSide(0, { allianceId: 1 }), makeSide(1));
    expect(isAlly(0, 1, sides)).toBe(false);
  });

  test("returns false when both sides have no allianceId", () => {
    const sides = sideMap(makeSide(0), makeSide(1));
    expect(isAlly(0, 1, sides)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isEnemy
// ---------------------------------------------------------------------------

describe("isEnemy", () => {
  test("returns true for distinct non-allied sides", () => {
    const sides = sideMap(makeSide(0), makeSide(1));
    expect(isEnemy(0, 1, sides)).toBe(true);
  });

  test("returns false for allied sides", () => {
    const sides = sideMap(
      makeSide(0, { allianceId: 5 }),
      makeSide(1, { allianceId: 5 }),
    );
    expect(isEnemy(0, 1, sides)).toBe(false);
  });

  test("returns false for the same side", () => {
    expect(isEnemy(0, 0, sideMap(makeSide(0)))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rollMorale: allied victory
// ---------------------------------------------------------------------------

describe("rollMorale — allied victory", () => {
  test("two surviving allied sides triggers victory (Phase.Completed)", () => {
    const side0 = makeSide(0, { allianceId: 1 });
    const side1 = makeSide(1, { allianceId: 1 });
    const unitA = makeUnit({ side: 0, x: 0, y: 0 });
    const unitB = makeUnit({ side: 1, x: 1, y: 0 });
    const store = makeStoreWith([unitA, unitB], [side0, side1]);

    store.dispatch(rollMorale(undefined));

    expect(selectPhase(store.getState())).toBe(Phase.Completed);
  });

  test("three-way: two allied survivors, one routed side → victory", () => {
    const side0 = makeSide(0, { allianceId: 1 });
    const side1 = makeSide(1, { allianceId: 1 });
    const side2 = makeSide(2, { allianceId: 2 });
    const unitA = makeUnit({ side: 0, x: 0, y: 0 });
    const unitB = makeUnit({ side: 1, x: 1, y: 0 });
    const routed = makeUnit({ side: 2, x: 2, y: 0, status: "Rout" });
    const store = makeStoreWith([unitA, unitB, routed], [side0, side1, side2]);

    store.dispatch(rollMorale(undefined));

    expect(selectPhase(store.getState())).toBe(Phase.Completed);
  });

  test("two surviving enemy sides does not trigger victory", () => {
    const side0 = makeSide(0);
    const side1 = makeSide(1);
    const unitA = makeUnit({ side: 0, x: 0, y: 0 });
    const unitB = makeUnit({ side: 1, x: 1, y: 0 });
    const store = makeStoreWith([unitA, unitB], [side0, side1]);

    store.dispatch(rollMorale(undefined));

    expect(selectPhase(store.getState())).not.toBe(Phase.Completed);
  });

  test("two allied plus one independent survivor does not trigger victory", () => {
    const side0 = makeSide(0, { allianceId: 1 });
    const side1 = makeSide(1, { allianceId: 1 });
    const side2 = makeSide(2); // independent, no alliance
    const unitA = makeUnit({ side: 0, x: 0, y: 0 });
    const unitB = makeUnit({ side: 1, x: 1, y: 0 });
    const unitC = makeUnit({ side: 2, x: 2, y: 0 });
    const store = makeStoreWith([unitA, unitB, unitC], [side0, side1, side2]);

    store.dispatch(rollMorale(undefined));

    expect(selectPhase(store.getState())).not.toBe(Phase.Completed);
  });
});
