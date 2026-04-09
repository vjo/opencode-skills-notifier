# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Atomic file writes:** Use `writeFile` to a `.tmp` path then `rename` to the final path. On rename failure, clean up the orphan with `unlink(...).catch(() => undefined)`. Import `unlink` from `fs/promises`.
- **Mock modules in Bun tests:** Use `mock.module("fs/promises", () => ({...}))` before dynamic `import("./module.ts")` in each test. Include ALL functions the module imports (`readFile`, `writeFile`, `rename`, `mkdir`, `unlink`, `readdir`, etc.) or the mock will fall through to the real fs. Cross-file contamination: if test file A mocks `fs/promises` without `readdir`, and file B's source imports `readdir`, file B's tests will fail in the full `bun test` run. Fix: keep all mocks complete across all test files.
- **Defensive JSON parsing pattern:** Two separate try/catch blocks — one for file read, one for JSON.parse — each returning `defaults()`. Then validate shape field-by-field with type guards.
- **node: specifier consistency:** Use `"node:fs/promises"`, `"node:os"`, `"node:path"` etc. across all source files. Mixing bare (`"fs/promises"`) and prefixed (`"node:fs/promises"`) specifiers causes Bun to treat them as different mock targets, causing cross-test contamination in `bun test` multi-file runs.

---

## 2026-04-09 - US-003
- Implemented `readCache()` and `writeCache()` in `src/cache.ts` with atomic writes via `.tmp` + `rename`
- Added `src/cache.test.ts` with 3 unit tests: missing file, malformed JSON, round-trip
- Fixed Medium code review finding: added `unlink` cleanup on rename failure to prevent orphan `.tmp` files
- Files changed: `src/cache.ts`, `src/cache.test.ts`
- **Learnings:**
  - Bun's `mock.module` requires all imported names to be present in the mock object — missing `unlink` would have caused test failures after adding it to the source
  - `rename` is not atomic across filesystem boundaries (EXDEV) — wrapping it in try/catch with cleanup is the correct pattern for local CLI tools
  - Module-level `CACHE_FILE` constant computed at import time is fine for a CLI tool but complicates testing; accepted trade-off here

---

## 2026-04-10 - US-004
- Implemented `getLocalSkills(directory, scope)` and `discoverLocalRepos(directory)` in `src/discovery.ts`
- `getLocalSkills` scans `~/.agents/skills/` (global), `<dir>/.agents/skills/` (project), or both, returning a `Set<string>` of folder names. Returns empty Set on ENOENT.
- `discoverLocalRepos` reads `.git/config` under each skill subdir, extracts `[remote "origin"] url`, deduplicates via Set. Returns `[]` when `.agents/skills/` doesn't exist.
- Added `src/discovery.test.ts` with 9 unit tests covering all AC scenarios
- Added `readdir` as no-op to `cache.test.ts` mocks to prevent cross-file mock contamination in full `bun test` runs
- Files changed: `src/discovery.ts`, `src/discovery.test.ts`, `src/cache.test.ts`
- **Learnings:**
  - Cross-file mock contamination in `bun test`: if any test file mocks `fs/promises` without `readdir`, discovery's `import { readdir } from "node:fs/promises"` fails in the full suite. Fix: keep all mocks complete.
  - `"fs/promises"` and `"node:fs/promises"` are treated as different mock targets by Bun — standardize on `node:` prefix across all source files.
  - CRLF bug: `.git/config` files written on Windows end lines with `\r\n`. After `.trim()` on a pre-trimmed line, trailing `\r` inside a regex capture group is not stripped by `.trim()` alone. Fixed with `.trim().replace(/\r$/, "")`.
  - `Promise.all` with concurrent `Set.add` writers is safe in single-threaded JS but is a footgun pattern; accepted trade-off for this CLI tool.

---
