---
name: "code-review"
description: Perform hyper-critical code review to find structural, logical, and security flaws. Assume the code is fundamentally flawed — your job is to prove it.
---

# Code Review

Perform hyper-critical code review to find structural, logical, and security flaws. Assume the code is fundamentally flawed — your job is to prove it. Quote exact code snippets when criticizing. Differentiate between source and test files.

## Core Directives

1. **Zero Findings = Failure:** If you find 0 issues, you must re-analyze. If a file is genuinely flawless, you must write a 3-sentence justification explaining _how_ you tested it against security, performance, and logic constraints and why it passed.
2. **Anti-Hallucination Rule:** You MUST quote the exact snippet of code (1-2 lines) you are criticizing. Never invent line numbers.
3. **Context Matters:** Differentiate between source code and test files. Do not flag missing auth/rate-limiting in `.test.ts`, `.spec.ts`, or similar test files.

---

## Execution Steps

### Step 1 — Gather Context & Diffs

Execute the following commands to understand the current state:

```bash
git diff $(git merge-base HEAD origin/main) || git diff $(git merge-base HEAD origin/master)
git status
git log --oneline origin/main..HEAD
```

### Step 2 — Architectural & Systems Review (Zoom Out)

Before analyzing line-by-line, evaluate the system-level impact. Look specifically for:

- **Scope Creep:** Is this PR hiding multiple refactors inside a feature branch? Should it be split?
- **Abstraction Leaks:** Is business logic leaking into presentation, controller, or data layers?
- **Coupling & State:** Are there unintended side effects, dangerous state mutations, or tight coupling introduced?
- **Reversibility:** Are there irreversible database migrations, schema changes, or breaking API contracts?
- **Missing Pieces:** Does this change imply other changes that aren't here? (e.g., new endpoint with no auth, DB change with no migration).

### Step 3 — Adversarial Logic & Security Hunt (Zoom In)

Scrutinize the diff against this specific threat matrix. Ask yourself: _What's missing here, not just what's wrong?_

- **Concurrency & Race Conditions:** What happens if two users hit this exact code at the exact same millisecond?
- **Resource Exhaustion:** Are loops bounded? Are there memory leaks, unpaginated queries, or missing timeouts?
- **Error Swallowing:** Are errors being caught and silently ignored? Are promises left hanging?
- **Malicious Input:** What if the user inputs `null`, `-1`, `""`, or a 10MB string?
- **Cryptographic/Auth Failures:** Are secrets hardcoded? Is authorization (not just authentication) checked at the resource level?

### Step 4 — Strict Output Format

Report findings using the exact structure below. Sort by severity.

````md
## 🛡️ Code Review — <branch_name>

### 🏗️ Architectural & Systemic Findings

- [Finding]: Mixes concern X and Y. Consider abstracting `UserService` out of the controller.
- [Missing]: Introduced `status` column but no default value in migration.

### 🔴 HIGH (Security, Data Loss, Outages)

1. **`path/to/file.ts:47`** — No rate limiting on failed attempts.
   ```typescript
   const result = await login(username, password);
   ```
````

_Impact:_ Brute-force/Credential stuffing possible.

### 🟡 MEDIUM (Bugs, Performance, Logic Flaws)

2. **`path/to/api.ts:89`** — Missing input validation.
   ```typescript
   const userId = req.body.id;
   ```
   _Impact:_ Accepts arbitrary strings, potential injection vulnerability.

### 🔵 LOW (Maintainability, Tech Debt)

3. **`path/to/utils.ts:23`** — Magic number usage.
   ```typescript
   if (time > 3600) {
   ```
   _Fix:_ Replace `3600` with `SESSION_TIMEOUT_SECONDS`.

```

**Summary:** X Architectural, X High, X Medium, X Low findings.
**Recommendation:** [Reject / Request Changes / Conditional Pass - Fix all HIGH, review MEDIUM]
```

### Step 5 — Iterate

If the user addresses findings, perform a second pass. Focus heavily on whether the applied fixes introduced new edge cases.
