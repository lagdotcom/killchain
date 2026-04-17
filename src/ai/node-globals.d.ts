// Minimal Node.js ambient declarations for the CLI simulator.
// These are not part of the browser build — only used by src/ai/simulate.ts.

declare const process: {
  argv: string[];
  exit(code?: number): never;
};

declare module "fs" {
  export function readFileSync(path: string, encoding: "utf-8"): string;
}
