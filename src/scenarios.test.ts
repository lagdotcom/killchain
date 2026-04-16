import { describe, expect, test } from "vitest";

import type {
  Cells,
  MapId,
  ScenarioId,
  SideId,
  UnitDefinitionId,
} from "./flavours.js";
import { Phase } from "./killchain/rules.js";
import type { DeploymentZone, UnitDefinition } from "./killchain/types.js";
import { heavyFoot, lightFoot } from "./killchain/units.js";
import { loadScenarioAction } from "./state/actions.js";
import { rosterAdapter } from "./state/roster.js";
import type { Scenario } from "./state/scenarios.js";
import {
  selectAllSides,
  selectAllUnits,
  selectBattle,
  selectPhase,
  selectPlacedUnits,
  selectUnplacedUnits,
} from "./state/selectors.js";
import { makeStore } from "./state/store.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDef(
  id: string,
  partial: Partial<Omit<UnitDefinition, "id">> = {},
): UnitDefinition {
  return {
    id: id as UnitDefinitionId,
    name: id,
    type: heavyFoot,
    ...partial,
  };
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "s1" as ScenarioId,
    name: "Test Scenario",
    mapId: "map1" as MapId,
    sides: [
      {
        id: 0 as SideId,
        name: "Side A",
        colour: "#00f",
        units: [{ definitionId: "def1" as UnitDefinitionId }],
      },
      {
        id: 1 as SideId,
        name: "Side B",
        colour: "#f00",
        units: [{ definitionId: "def2" as UnitDefinitionId }],
      },
    ],
    ...overrides,
  };
}

function storeWithDefs(...defs: UnitDefinition[]) {
  const rosterState = rosterAdapter.setAll(
    rosterAdapter.getInitialState(),
    defs,
  );
  return makeStore({ roster: rosterState });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("loadScenarioAction", () => {
  test("creates units for each side from roster definitions", () => {
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    store.dispatch(loadScenarioAction(makeScenario()));

    const units = selectAllUnits(store.getState());
    expect(units).toHaveLength(2);
    expect(units.map((u) => u.side).sort()).toEqual([0, 1]);
  });

  test("skips units whose definition is missing and logs a warning", () => {
    const store = storeWithDefs(makeDef("def1")); // def2 missing
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(String(args[0]));
    };

    store.dispatch(loadScenarioAction(makeScenario()));

    console.warn = origWarn;
    const units = selectAllUnits(store.getState());
    expect(units).toHaveLength(1);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test("pre-placed units have their coordinates set", () => {
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    const scenario = makeScenario({
      sides: [
        {
          id: 0 as SideId,
          name: "Side A",
          colour: "#00f",
          units: [
            {
              definitionId: "def1" as UnitDefinitionId,
              x: 3 as Cells,
              y: 4 as Cells,
            },
          ],
        },
        {
          id: 1 as SideId,
          name: "Side B",
          colour: "#f00",
          units: [{ definitionId: "def2" as UnitDefinitionId }],
        },
      ],
    });
    store.dispatch(loadScenarioAction(scenario));

    const placed = selectPlacedUnits(store.getState());
    const unplaced = selectUnplacedUnits(store.getState());
    expect(placed).toHaveLength(1);
    expect(placed[0]!.x).toBe(3);
    expect(placed[0]!.y).toBe(4);
    expect(unplaced).toHaveLength(1);
  });

  test("Placement phase only contains sides with deployable units", () => {
    // Side A: all pre-placed; Side B: deployable → only Side B in sideOrder
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    const scenario = makeScenario({
      sides: [
        {
          id: 0 as SideId,
          name: "Side A",
          colour: "#00f",
          units: [
            {
              definitionId: "def1" as UnitDefinitionId,
              x: 1 as Cells,
              y: 1 as Cells,
            },
          ],
        },
        {
          id: 1 as SideId,
          name: "Side B",
          colour: "#f00",
          units: [{ definitionId: "def2" as UnitDefinitionId }],
        },
      ],
    });
    store.dispatch(loadScenarioAction(scenario));

    const battle = selectBattle(store.getState());
    expect(battle.sideOrder).toEqual([1]);
    expect(battle.canPass).toBe(false);
  });

  test("canPass starts true when all units are pre-placed", () => {
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    const scenario = makeScenario({
      sides: [
        {
          id: 0 as SideId,
          name: "Side A",
          colour: "#00f",
          units: [
            {
              definitionId: "def1" as UnitDefinitionId,
              x: 1 as Cells,
              y: 1 as Cells,
            },
          ],
        },
        {
          id: 1 as SideId,
          name: "Side B",
          colour: "#f00",
          units: [
            {
              definitionId: "def2" as UnitDefinitionId,
              x: 8 as Cells,
              y: 8 as Cells,
            },
          ],
        },
      ],
    });
    store.dispatch(loadScenarioAction(scenario));

    const battle = selectBattle(store.getState());
    expect(battle.canPass).toBe(true);
    expect(battle.sideOrder).toEqual([]);
  });

  test("deployment zones are propagated to side entities", () => {
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    const zone: DeploymentZone = {
      x: 0 as Cells,
      y: 0 as Cells,
      width: 4 as Cells,
      height: 3 as Cells,
    };
    const scenario = makeScenario({
      sides: [
        {
          id: 0 as SideId,
          name: "Side A",
          colour: "#00f",
          deploymentZone: zone,
          units: [{ definitionId: "def1" as UnitDefinitionId }],
        },
        {
          id: 1 as SideId,
          name: "Side B",
          colour: "#f00",
          units: [{ definitionId: "def2" as UnitDefinitionId }],
        },
      ],
    });
    store.dispatch(loadScenarioAction(scenario));

    const sides = selectAllSides(store.getState());
    const sideA = sides.find((s) => s.id === 0);
    const sideB = sides.find((s) => s.id === 1);
    expect(sideA?.deploymentZone).toEqual(zone);
    expect(sideB?.deploymentZone).toBeUndefined();
  });

  test("unit inherits shortName and missile from definition", () => {
    const store = storeWithDefs(
      makeDef("def1", { shortName: "HA", missile: true, type: lightFoot }),
    );
    const scenario = makeScenario({
      sides: [
        {
          id: 0 as SideId,
          name: "Side A",
          colour: "#00f",
          units: [{ definitionId: "def1" as UnitDefinitionId }],
        },
        { id: 1 as SideId, name: "Side B", colour: "#f00", units: [] },
      ],
    });
    store.dispatch(loadScenarioAction(scenario));

    const units = selectAllUnits(store.getState());
    expect(units[0]!.shortName).toBe("HA");
    expect(units[0]!.missile).toBe(true);
    expect(units[0]!.type).toEqual(lightFoot);
  });

  test("phase starts at Placement", () => {
    const store = storeWithDefs(makeDef("def1"), makeDef("def2"));
    store.dispatch(loadScenarioAction(makeScenario()));

    expect(selectPhase(store.getState())).toBe(Phase.Placement);
  });
});
