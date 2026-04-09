# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Atomic file writes:** Use `writeFile` to a `.tmp` path then `rename` to the final path. On rename failure, clean up the orphan with `unlink(...).catch(() => undefined)`. Import `unlink` from `fs/promises`.
- **Mock modules in Bun tests:** Use `mock.module("fs/promises", () => ({...}))` before dynamic `import("./module.ts")` in each test. Include all functions the module imports (`readFile`, `writeFile`, `rename`, `mkdir`, `unlink`, etc.) or the mock will fall through to the real fs.
- **Defensive JSON parsing pattern:** Two separate try/catch blocks — one for file read, one for JSON.parse — each returning `defaults()`. Then validate shape field-by-field with type guards.

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
