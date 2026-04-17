import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/ai/simulate.ts"],
    reporters: ["verbose"],
    testTimeout: 120_000,
  },
});
