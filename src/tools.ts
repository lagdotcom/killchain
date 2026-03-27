import SeedRandom from "seed-random";

import type { Cells } from "./flavours.js";
import type { XY } from "./killchain/EuclideanEngine.js";

export const enumerate = (n: number) => Array.from({ length: n }, (_, i) => i);

type ClassNameValue = string | Record<string, boolean> | undefined | null;

export function classnames(...args: ClassNameValue[]) {
  return args
    .map((cn) => {
      if (typeof cn === "string") return cn;
      if (typeof cn === "object" && cn !== null) {
        return Object.entries(cn)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(" ");
      }
      return "";
    })
    .join(" ")
    .trim();
}

export function isDefined<T>(value?: T): value is T {
  return typeof value !== "undefined";
}

export function without<T>(data: T[], match: T) {
  return data.filter((item) => item !== match);
}

const generator = SeedRandom();

export function rollDice(max: number) {
  return Math.ceil(generator() * max);
}

export function manhattanDistance(a: XY, b: XY): Cells {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
