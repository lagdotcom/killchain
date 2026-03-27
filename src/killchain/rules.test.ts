import { describe, expect, test } from "vitest";

import { EuclideanEngine } from "./EuclideanEngine.js";
import { getAttackRollTarget, getMovementCost } from "./rules.js";
import {
  heavyFoot,
  heavyHorse,
  lightHorse,
  mediumHorse,
  unarmouredTroops,
} from "./units.js";

test.each([
  [unarmouredTroops, 3],
  [lightHorse, 4],
  [mediumHorse, 5],
  [heavyHorse, 6],
])("melee attack on $armour -> $1", (type, expected) => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(expected);
});

test.each([
  [unarmouredTroops, 5, 3],
  [unarmouredTroops, 10, 4],
  [unarmouredTroops, 15, 5],
  [lightHorse, 5, 4],
  [lightHorse, 10, 5],
  [lightHorse, 15, 6],
  [mediumHorse, 5, 5],
  [mediumHorse, 10, 6],
  [mediumHorse, 15, 7],
  [heavyHorse, 5, 6],
  [heavyHorse, 10, 7],
  [heavyHorse, 15, 8],
])("missile attack on $armour at range $1 -> $2", (type, range, expected) => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type }, range, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(expected);
});

test("firing in woods is at -1", () => {
  const g = new EuclideanEngine();
  g.setTerrain(0, 0, "Woods");

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 5, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(4);
});

test("firing into woods is at -1", () => {
  const g = new EuclideanEngine();
  g.setTerrain(5, 0, "Woods");

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 5, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(4);
});

test("firing both in and into woods is still only at -1", () => {
  const g = new EuclideanEngine();
  g.setTerrain(0, 0, "Woods");
  g.setTerrain(5, 0, "Woods");

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 5, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(4);
});

test("fighting downhill is at +1", () => {
  const g = new EuclideanEngine();
  g.setTerrain(0, 0, "Open", 1);

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(2);
});

test("fighting uphill gives no bonus", () => {
  const g = new EuclideanEngine();
  g.setTerrain(1, 0, "Open", 1);

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(3);
});

test("missile beyond max range is impossible", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 16, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(Infinity);
});

test("archer in melee suffers -1 penalty", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit(
    { side: 0, type: unarmouredTroops, missile: true },
    0,
    0,
  );
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  // Unarmoured base 3 + 1 archer penalty = 4
  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(4);
});

test("archer penalty does not apply to missile attacks", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit(
    { side: 0, type: unarmouredTroops, missile: true },
    0,
    0,
  );
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 5, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(3);
});

test("non-archer in melee has no archer penalty", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(3);
});

test("cavalry charge gives +1 in melee", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: lightHorse, moved: 3 }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  // Unarmoured base 3 - 1 charge = 2
  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(2);
});

test("cavalry charge does not apply to missile attacks", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit(
    { side: 0, type: lightHorse, missile: true, moved: 3 },
    0,
    0,
  );
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 5, 0);

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(3);
});

test("unmoved cavalry gets no charge bonus", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: lightHorse }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(3);
});

test("flanking gives +1 when defender already engaged", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit(
    { side: 1, type: unarmouredTroops, flankCount: 1 },
    1,
    0,
  );

  // Unarmoured base 3 - 1 flank = 2
  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(2);
});

test("flanking does not apply to missile attacks", () => {
  const g = new EuclideanEngine();
  const attacker = g.addUnit(
    { side: 0, type: unarmouredTroops, missile: true },
    0,
    0,
  );
  const defender = g.addUnit(
    { side: 1, type: unarmouredTroops, flankCount: 1 },
    5,
    0,
  );

  expect(getAttackRollTarget(g, true, attacker, defender)).toBe(3);
});

test("woods penalty does not apply to melee", () => {
  const g = new EuclideanEngine();
  g.setTerrain(1, 0, "Woods");

  const attacker = g.addUnit({ side: 0, type: unarmouredTroops }, 0, 0);
  const defender = g.addUnit({ side: 1, type: unarmouredTroops }, 1, 0);

  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(3);
});

test("multiple bonuses and penalties combine", () => {
  const g = new EuclideanEngine();
  g.setTerrain(0, 0, "Open", 2);
  g.setTerrain(1, 0, "Open", 1);

  // Cavalry charging downhill against a flanked defender
  const attacker = g.addUnit({ side: 0, type: lightHorse, moved: 5 }, 0, 0);
  const defender = g.addUnit({ side: 1, type: heavyFoot, flankCount: 1 }, 1, 0);

  // Heavy base 6 - 1 hill - 1 charge - 1 flank = 3
  expect(getAttackRollTarget(g, false, attacker, defender)).toBe(3);
});

describe("getMovementCost", () => {
  test("open flat terrain costs 1", () => {
    const g = new EuclideanEngine();
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(1);
  });

  test("moving uphill costs 2", () => {
    const g = new EuclideanEngine();
    g.setTerrain(1, 0, "Open", 1);
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(2);
  });

  test("moving downhill costs 1", () => {
    const g = new EuclideanEngine();
    g.setTerrain(0, 0, "Open", 1);
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(1);
  });

  test("moving into woods costs 2", () => {
    const g = new EuclideanEngine();
    g.setTerrain(1, 0, "Woods");
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(2);
  });

  test("moving into marsh costs 2", () => {
    const g = new EuclideanEngine();
    g.setTerrain(1, 0, "Marsh");
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(2);
  });

  test("moving uphill into woods costs 3", () => {
    const g = new EuclideanEngine();
    g.setTerrain(1, 0, "Woods", 1);
    const from = g.at(0, 0);
    const to = g.at(1, 0);

    expect(getMovementCost(g, from, to)).toBe(3);
  });
});
