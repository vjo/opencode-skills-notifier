# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Config parsing pattern**: Field-by-field extraction with type guards; use a `defaults()` factory function (not a `DEFAULTS` const) to avoid shared array reference bugs. Guard numeric fields with `> 0` when the domain implies positive values.
- **Bun test mocking**: Use `mock.module("fs/promises", ...)` + dynamic `import("./module.ts")` inside each `it()` block. Bun re-evaluates the mock per test case when using dynamic imports. No `beforeEach`/`afterEach` needed for this pattern.
- **tsconfig for Bun**: Exclude `*.test.ts` from main tsconfig to avoid `bun:test` type errors. Use `@types/node` for Node built-in types.

---

## 2026-04-09 - US-001
- Implemented project scaffolding: package.json, tsconfig.json, src/types.ts
- Files changed: package.json, tsconfig.json, src/types.ts, bun.lock (generated)
- **Learnings:**
  - @opencode-ai/plugin resolves to v1.4.2 from npm
  - tsconfig uses `"moduleResolution": "bundler"` (not "node16") with ESNext target/module — required for Bun compatibility
  - `bun run build` (tsc) and `bun run typecheck` both pass with only types.ts in src/
---

## 2026-04-09 - US-002
- Implemented `src/config.ts` with `readPluginConfig(): Promise<PluginConfig>`
- Returns safe defaults when config file is missing, JSON is invalid, or section key is absent
- Parses all four fields (`enabled`, `checkIntervalMinutes`, `repositories`, `skillsScope`) with type guards
- Added 4 unit tests in `src/config.test.ts` covering all acceptance criteria cases
- Files changed: `src/config.ts`, `src/config.test.ts`, `package.json` (added `test` script), `tsconfig.json` (exclude test files), `bun.lock`
- **Learnings:**
  - `DEFAULTS` const with array field causes shared-reference bug — always use a `defaults()` factory function so each return gets a fresh array copy
  - Numeric config fields should guard `> 0` to reject semantically invalid values (e.g. `checkIntervalMinutes: -1`)
  - Bun's `mock.module` + dynamic `import()` inside each `it()` block provides per-test mock isolation without `beforeEach`/`afterEach`
  - Add `bun-types` + `@types/node` to devDeps; exclude `*.test.ts` from tsconfig so `bun:test` types don't cause `tsc` errors
---
