# KillChain

A TypeScript/React/Redux turn-based grid wargame implementing the KillChain mass-combat rules.

## Commands

```sh
yarn dev          # dev server (Vite, port 3000)
yarn build        # production build
yarn test         # run tests (Vitest)
yarn lint         # check lint
yarn lint:fix     # auto-fix lint errors
npx tsc --noEmit  # type-check only
```

## Before committing

Run `yarn lint:fix` and `npx tsc --noEmit` and make sure both are clean. If you implemented something that is listed in `TODO.md`, remove or update the relevant item.

## Architecture

### State (`src/state/`)

Redux Toolkit with entity adapters for normalised state. Key files:

| File | Purpose |
|------|---------|
| `store.ts` | Store factory; exports `AppState`, `AppDispatch` |
| `actions.ts` | All thunks — attack, move, pass, rollMorale, etc. |
| `battle.ts` | Phase, active unit, turn counter, messages |
| `sides.ts` | Side entities; re-exports `isAlly`/`isEnemy` from `alliance.ts` |
| `alliance.ts` | `isAlly()` / `isEnemy()` — import from here, not `sides.ts`, to avoid a circular dep (sides → actions → selectors → sides) |
| `selectors.ts` | Memoised selectors; always prefer these over raw state access |

### AI (`src/ai/`)

Greedy heuristic, one thunk per phase. `runAiTurn()` in `index.ts` dispatches the right phase thunk. Each thunk loops over its units and **re-reads state with `getState()` inside the loop** — positions change after every move/attack.

Personalities (`AiConfig` in `types.ts`): `aggressive`, `defensive`, `berserker`.

### Rules engine (`src/killchain/`)

`KillChainEngine` implements the `KillChain<P>` interface (terrain costs, attack modifiers, LOS). `rules.ts` has the phase enum and modifier tables. **Never** instantiate the engine outside a thunk — it closes over `unitEntities` which must be fresh.

### Flavoured types (`src/flavours.ts`)

Branded primitives prevent silent unit mixing:

```ts
type Cells = number & { __cells: never };
type Feet  = number & { __feet: never };
// also: SideId, UnitId, MapId, ScenarioId, TerrainId, UnitDefinitionId
```

Cast deliberately; avoid casting away to `number` without reason.

## Key conventions

### `exactOptionalPropertyTypes` is on

You cannot assign `{ foo: undefined }` to `{ foo?: string }`. Use spread conditionals:

```ts
// ✓
{ ...(val !== undefined && { foo: val }) }
// ✗
{ foo: val ?? undefined }
```

When clearing an optional field via `setState`, destructure it away:

```ts
const { fieldToRemove: _, ...rest } = obj;
return rest;
```

### `noUncheckedIndexedAccess` is on

Array index and record lookup return `T | undefined`. Guard or use non-null assertion (`!`) only when you're certain.

### Imports must use `.js` extensions

Even for `.ts` source files — Vite resolves them correctly. ESLint's `simple-import-sort` enforces ordering: external → internal → relative.

### Never import `isAlly`/`isEnemy` from `sides.ts` in files that `sides.ts` also depends on (directly or transitively)

Import from `state/alliance.ts` instead. This is how `logic.ts` avoids the circular dependency.

### `while(true)` is banned by the linter — use `for (;;)`

### Unary `-` on branded types fails strict linting — use `0 - value`

### React memoization dep arrays must include all captured variables

The React Compiler plugin enforces this. Missing deps are lint errors, not just warnings.

## Phase sequence

```
Placement → Surprise → Initiative → Missile → Move → Melee → Morale → (next turn)
```

- **Surprise** and **Initiative**: single-pass; all sides go then phase advances.
- **Missile / Move / Melee**: sides alternate in initiative order.
- `selectCanPassNow` blocks passing during Move while any Shaken unit of the active side is in melee contact (must exit first).

## Testing

Tests live alongside source (`*.test.ts`). Run with `yarn test`. When calling `getTints()` in tests, pass an empty `{}` as the fifth `sideEntities` argument — sides with different IDs are treated as enemies by default.
