import { describe, expect, test } from "vitest";

import { makeSide } from "../testHelpers.js";
import { getMoraleStatus } from "./actions.js";

describe("getMoraleStatus", () => {
  test("returns the side with the most casualties", () => {
    const sides = [
      makeSide(0, { casualties: 3 }),
      makeSide(1, { casualties: 5 }),
    ];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side).toBeDefined();
    expect(result.side!.id).toBe(1);
  });

  test("returns tied when casualties are equal", () => {
    const sides = [
      makeSide(0, { casualties: 3 }),
      makeSide(1, { casualties: 3 }),
    ];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("tied");
    expect(result.side).toBeUndefined();
  });

  test("returns none when no casualties", () => {
    const sides = [makeSide(0), makeSide(1)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("none");
    expect(result.side).toBeUndefined();
  });

  test("works with more than two sides", () => {
    const sides = [
      makeSide(0, { casualties: 1 }),
      makeSide(1, { casualties: 4 }),
      makeSide(2, { casualties: 2 }),
    ];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side!.id).toBe(1);
  });

  test("returns tied when multiple sides tie for most", () => {
    const sides = [
      makeSide(0, { casualties: 5 }),
      makeSide(1, { casualties: 5 }),
      makeSide(2, { casualties: 1 }),
    ];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("tied");
    expect(result.side).toBeUndefined();
  });

  test("single side with casualties", () => {
    const sides = [makeSide(0, { casualties: 3 }), makeSide(1)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side!.id).toBe(0);
  });
});
