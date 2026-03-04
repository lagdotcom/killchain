import { expect, test } from "vitest";

import { EuclideanEngine } from "./EuclideanEngine.js";
import { getAttackRollTarget } from "./rules.js";
import {
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
