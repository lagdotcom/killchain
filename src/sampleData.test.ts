import { describe, expect, test } from "vitest";

import { generateMap } from "./sampleData.js";

describe("generateGridMap with seed", () => {
  test("same seed produces identical maps", () => {
    const a = generateMap("map1", 10, "square", 8, 8, 42);
    const b = generateMap("map2", 10, "square", 8, 8, 42);

    // Compare all cell terrain types
    for (const id of Object.keys(a.cells.entities)) {
      expect(a.cells.entities[id]?.type).toBe(b.cells.entities[id]?.type);
      expect(a.cells.entities[id]?.elevation).toBe(
        b.cells.entities[id]?.elevation,
      );
    }
  });

  test("different seeds produce different maps", () => {
    const a = generateMap("map1", 10, "square", 8, 8, 1);
    const b = generateMap("map2", 10, "square", 8, 8, 2);

    const types_a = Object.values(a.cells.entities).map((c) => c.type);
    const types_b = Object.values(b.cells.entities).map((c) => c.type);

    // Almost certainly different — two seeded maps should differ
    expect(types_a.join(",")).not.toBe(types_b.join(","));
  });

  test("unseeded map differs between calls (random)", () => {
    const a = generateMap("map1", 10, "square", 8, 8);
    const b = generateMap("map2", 10, "square", 8, 8);

    const types_a = Object.values(a.cells.entities).map((c) => c.type);
    const types_b = Object.values(b.cells.entities).map((c) => c.type);

    // With random noise the two maps are extremely unlikely to be identical
    expect(types_a.join(",")).not.toBe(types_b.join(","));
  });
});
