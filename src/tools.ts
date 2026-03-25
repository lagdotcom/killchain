import SeedRandom from "seed-random";

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
    .join(" ");
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
