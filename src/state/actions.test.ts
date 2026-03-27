import { describe, expect, test } from "vitest";

import type { SideId, UnitId } from "../flavours.js";
import { getMoraleStatus } from "./actions.js";
import type { SideEntity } from "./sides.js";

function makeSide(id: number, casualties: number): SideEntity {
  return {
    id: id as SideId,
    colour: "red",
    name: `Side ${id}`,
    unplacedIds: [] as UnitId[],
    surprised: false,
    casualties,
    initiative: 0,
  };
}

describe("getMoraleStatus", () => {
  test("returns the side with the most casualties", () => {
    const sides = [makeSide(0, 3), makeSide(1, 5)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side).toBeDefined();
    expect(result.side!.id).toBe(1 as SideId);
  });

  test("returns tied when casualties are equal", () => {
    const sides = [makeSide(0, 3), makeSide(1, 3)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("tied");
    expect(result.side).toBeUndefined();
  });

  test("returns none when no casualties", () => {
    const sides = [makeSide(0, 0), makeSide(1, 0)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("none");
    expect(result.side).toBeUndefined();
  });

  test("works with more than two sides", () => {
    const sides = [makeSide(0, 1), makeSide(1, 4), makeSide(2, 2)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side!.id).toBe(1 as SideId);
  });

  test("returns tied when multiple sides tie for most", () => {
    const sides = [makeSide(0, 5), makeSide(1, 5), makeSide(2, 1)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("tied");
    expect(result.side).toBeUndefined();
  });

  test("single side with casualties", () => {
    const sides = [makeSide(0, 3), makeSide(1, 0)];
    const result = getMoraleStatus(sides);

    expect(result.type).toBe("loser");
    expect(result.side!.id).toBe(0 as SideId);
  });
});
