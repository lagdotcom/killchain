import type { UnitType } from "./types.js";

export const unarmouredTroops: UnitType = {
  name: "Unarmoured",
  hits: 1,
  armour: "Unarmoured",
  move: 12,
  morale: 6,
};

export const lightFoot: UnitType = {
  name: "Light Foot",
  hits: 1,
  armour: "Light",
  move: 12,
  morale: 7,
};

export const mediumFoot: UnitType = {
  name: "Medium Foot",
  hits: 1,
  armour: "Medium",
  move: 9,
  morale: 7, // this isn't specified!!
};

export const heavyFoot: UnitType = {
  name: "Heavy Foot",
  hits: 1,
  armour: "Heavy",
  move: 6,
  morale: 8,
};

export const lightHorse: UnitType = {
  name: "Light Horse",
  hits: 2,
  armour: "Light",
  move: 24,
  morale: 9,
};

export const mediumHorse: UnitType = {
  name: "Medium Horse",
  hits: 2,
  armour: "Medium",
  move: 18,
  morale: 10,
};

export const heavyHorse: UnitType = {
  name: "Heavy Horse",
  hits: 2,
  armour: "Heavy",
  move: 12,
  morale: 11,
};
