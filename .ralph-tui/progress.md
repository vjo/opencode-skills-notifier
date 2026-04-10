# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Bun mock.module isolation
Each test file must be run in its own `bun test` process to avoid mock leakage. The package.json test script uses `for f in src/*.test.ts; do bun test "$f" || exit 1; done` — always run `bun run test`, not bare `bun test`, to get proper isolation.

### Bun mock.module restoration pattern
At the top of a test file, statically import all real modules that will be mocked inside tests. In `afterAll`, restore them via `mock.module("./mod.ts", () => realMod)`. Include ALL mocked modules — both local (`./cache.ts`) and built-ins (`node:fs/promises`, `node:os`) — or they will leak into other files when running in a single Bun process.

### node: prefix vs bare specifier
Source files are inconsistent: `cache.ts` and `config.ts` import `"fs/promises"` / `"os"` (bare), while `discovery.ts` and `checker.ts` import `"node:fs/promises"` / `"node:os"` (with prefix). Tests must mock the exact specifier the source file uses.

---

## 2026-04-10 - US-005
- **What was implemented**: `src/checker.ts` (already existed from a prior iteration) and `src/checker.test.ts`. Both were complete and correct.
- **Files changed**: None — implementation was already present. Updated `.ralph-tui/progress.md` with learnings.
- **Learnings:**
  - `bun test` (no args) runs all test files in a single process, causing `mock.module` leakage between files. The test script `for f in src/*.test.ts; do bun test "$f" || exit 1; done` runs each file in its own process, which is the correct way to run tests.
  - `checker.ts` uses Bun's `$` shell helper exported from `./shell.ts` (which re-exports from `"bun"`). The fluent chain `.env({...}).quiet()` and `.text()` must all be accounted for in test mocks.
  - `withTimeout` wraps any promise — used for both ls-remote (10s) and clone (30s) git calls.
  - `spawnCheck` writes cache with updated `last_checked_at` only when not rate-limited; it also evicts stale `notified_skills` before comparing with newly discovered skills.
---

