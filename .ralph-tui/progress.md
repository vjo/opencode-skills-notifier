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

## 2026-04-10 - US-007
- **What was implemented**: Smoke-test setup — updated `src/checker.ts` toast message format to include `npx skills add <repo-url>` install command (single-line condensed, newline-safe). Created `~/.config/opencode/plugins/opencode-skills-notifier.js` as a symlink to `dist/index.js`. Created `~/.config/opencode/opencode.json` with `checkIntervalMinutes: 1` and `https://github.com/anthropics/claude-code-skills` as the test repository.
- **Files changed**: `src/checker.ts` (toast message refactored to group skills by repo and emit per-repo install commands), `dist/checker.js` (rebuilt), `~/.config/opencode/plugins/opencode-skills-notifier.js` (new symlink), `~/.config/opencode/opencode.json` (new config).
- **Learnings:**
  - Use `\u2014` (em dash `—`) as separator in single-line toast messages; avoids `\n` rendering uncertainty in TUI toasts.
  - Grouping `newSkills` by repo (`newByRepo`) lets the message emit per-repo `npx skills add <url>` install commands — important when skills span multiple repos.
  - `checkIntervalMinutes: 1` in the test config enables rapid re-checking during manual smoke tests; change back to 60 for production use.
  - The `~/.config/opencode/plugins/` directory must be created manually — OpenCode does not create it on first run.
---

## 2026-04-10 - US-006
- **What was implemented**: `src/index.ts` — exports `SkillsNotifierPlugin` typed as `Plugin` from `@opencode-ai/plugin`. The plugin registers an `event` hook that calls `spawnCheck(client, directory).catch(() => {})` as fire-and-forget when `event.type === "session.created"`. Also created `src/index.test.ts` with three tests.
- **Files changed**: `src/index.ts` (new), `src/index.test.ts` (new). Build produced `dist/index.js` and `dist/index.d.ts`.
- **Learnings:**
  - `Plugin` type is `(input: PluginInput, options?: PluginOptions) => Promise<Hooks>`. To hook `session.created`, use the `event` hook in the returned `Hooks` object and check `event.type === "session.created"`.
  - Fire-and-forget pattern: `spawnCheck(client, directory).catch(() => {})` — the `.catch` is required to suppress unhandled rejections; the hook itself does not `await` the call, so it returns synchronously from the async event handler immediately.
  - Bun's `mock.module` caches modules per-process; dynamic `import("./index.ts")` inside tests picks up the mocked `checker.ts` because it uses the module registry.
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

