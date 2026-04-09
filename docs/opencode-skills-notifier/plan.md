# OpenCode Skills Notifier - Technical Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  OpenCode startup                                               │
│                                                                 │
│  session.created ──► plugin hook (sync, returns immediately)    │
│                           │                                     │
│                           └──► spawnCheck() [fire-and-forget]   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼───────────────┐
                    │  BackgroundChecker          │
                    │                             │
                    │  1. Read opencode.json       │
                    │  2. Read cache file          │
                    │  3. Rate-limit check         │
                    │  4. For each repo:           │
                    │     git ls-remote HEAD       │
                    │     if hash changed:         │
                    │       shallow clone → diff   │
                    │  5. Collect new skills       │
                    │  6. Write updated cache      │
                    │  7. client.tui.showToast()   │
                    └─────────────────────────────┘
```

---

## File Structure

```
opencode-skills-notifier/
├── src/
│   ├── index.ts          # Plugin entry point — exports SkillsNotifierPlugin
│   ├── checker.ts        # BackgroundChecker: git ops, diff logic
│   ├── cache.ts          # Cache read/write helpers
│   ├── config.ts         # Config parsing from opencode.json
│   ├── discovery.ts      # Implicit repo discovery from workspace
│   └── types.ts          # Shared TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

---

## Data Model

### Cache File

**Location**: `~/.config/opencode/skills-notifier-cache.json`

```ts
interface Cache {
  last_checked_at: string          // ISO 8601 timestamp
  repos: {
    [url: string]: {
      last_commit_hash: string     // HEAD hash from git ls-remote
      known_skills: string[]       // skill folder names seen in this repo
    }
  }
  notified_skills: string[]        // skill names already shown in toast
                                   // (to suppress repeat toasts after install)
}
```

**Default (no cache file)**:
```ts
{
  last_checked_at: "1970-01-01T00:00:00.000Z",
  repos: {},
  notified_skills: []
}
```

### Plugin Config (parsed from `opencode.json`)

```ts
interface PluginConfig {
  enabled: boolean                 // default: true
  checkIntervalMinutes: number     // default: 60
  repositories: string[]          // default: []
  skillsScope: "global" | "project" | "both"  // default: "both"
}
```

---

## Plugin Entry Point

```ts
// src/index.ts
import type { Plugin } from "@opencode-ai/plugin"
import { spawnCheck } from "./checker.js"

export const SkillsNotifierPlugin: Plugin = async ({ client, directory }) => {
  return {
    "session.created": async ({ session }) => {
      // Fire-and-forget — never awaited, never throws
      spawnCheck(client, directory).catch(() => {})
    },
  }
}
```

The hook returns synchronously. All async work happens inside `spawnCheck`.

---

## Config Parsing

**Source**: `~/.config/opencode/opencode.json`

```ts
// src/config.ts
export async function readPluginConfig(): Promise<PluginConfig> {
  const configPath = path.join(os.homedir(), ".config/opencode/opencode.json")
  try {
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"))
    const section = raw["opencode-skills-notifier"] ?? {}
    return {
      enabled: section.enabled ?? true,
      checkIntervalMinutes: section.checkIntervalMinutes ?? 60,
      repositories: section.repositories ?? [],
    }
  } catch {
    return { enabled: true, checkIntervalMinutes: 60, repositories: [] }
  }
}
```

**User config shape** (in `opencode.json`):
```json
{
  "plugin": ["opencode-skills-notifier"],
  "opencode-skills-notifier": {
    "enabled": true,
    "checkIntervalMinutes": 60,
    "skillsScope": "both",
    "repositories": [
      "git@github.com:your-org/ai-skills-monorepo.git"
    ]
  }
}
```

| Field | Default | Description |
|---|---|---|
| `enabled` | `true` | Set to `false` to fully disable the plugin |
| `checkIntervalMinutes` | `60` | Minimum time between remote checks |
| `repositories` | `[]` | Explicit list of skill repo URLs to track |
| `skillsScope` | `"both"` | Where to look for installed skills: `"global"` (`~/.agents/skills/`), `"project"` (`.agents/skills/` relative to workspace), or `"both"` |

> **Spec correction**: The config key is `"plugin"` (not `"plugins"`) and the file is `opencode.json` (not `config.json`), per the OpenCode docs.

---

## Implicit Repository Discovery

```ts
// src/discovery.ts
export async function discoverLocalRepos(directory: string): Promise<string[]> {
  const urls: string[] = []

  // 1. Scan .agents/ — each subdirectory may contain a .git/config with remote origin
  const agentsDir = path.join(directory, ".agents")
  // Read each subdir's .git/config and extract [remote "origin"] url

  // 2. Scan package.json for skills dependencies with git URLs
  const pkgPath = path.join(directory, "package.json")
  // Extract git-format URLs from dependencies/devDependencies values

  return [...new Set(urls)]
}
```

Merged unique set: `[...new Set([...configRepos, ...discoveredRepos])]`

---

## Background Checker

```ts
// src/checker.ts
export async function spawnCheck(client, directory: string): Promise<void> {
  const config = await readPluginConfig()
  if (!config.enabled) return

  const cache = await readCache()

  // Rate limiting
  const elapsed = Date.now() - new Date(cache.last_checked_at).getTime()
  const intervalMs = config.checkIntervalMinutes * 60 * 1000
  if (elapsed < intervalMs) return

  const configRepos = config.repositories
  const discoveredRepos = await discoverLocalRepos(directory)
  const allRepos = [...new Set([...configRepos, ...discoveredRepos])]

  const localSkills = await getLocalSkills(directory, config.skillsScope)

  // Evict notified_skills that have since been uninstalled
  // so users get re-notified if a skill disappears from their local install
  cache.notified_skills = cache.notified_skills.filter(s => localSkills.has(s))

  const newSkills: Array<{ name: string; repoUrl: string }> = []

  for (const repoUrl of allRepos) {
    try {
      const remoteSkills = await checkRepo(repoUrl, cache)
      for (const skill of remoteSkills) {
        if (!localSkills.has(skill) && !cache.notified_skills.includes(skill)) {
          newSkills.push({ name: skill, repoUrl })
        }
      }
    } catch {
      // Silent failure — skip repo
    }
  }

  // Update cache
  cache.last_checked_at = new Date().toISOString()
  if (newSkills.length > 0) {
    cache.notified_skills.push(...newSkills.map(s => s.name))
  }
  await writeCache(cache)

  // Show toast if new skills found
  if (newSkills.length > 0) {
    const lines = newSkills.map(
      s => `• ${s.name}  →  npx skills add ${s.repoUrl}`
    )
    const message = `New team skills available!\n\n${lines.join("\n")}`
    await client.tui.showToast({ body: { message, variant: "success" } })
  }
}
```

---

## Git Operations (Tier 2 Only)

Since the target repos have no `skills-index.json` manifest, all checks use the Git fallback path.

### Step 1 — Check if remote changed

```ts
async function getRemoteHash(repoUrl: string): Promise<string | null> {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" }
  const result = await $`git ls-remote ${repoUrl} HEAD`.env(env).quiet()
  // Output: "<hash>\tHEAD"
  return result.stdout.toString().split("\t")[0].trim() || null
}
```

Timeout: 10 seconds. If the command hangs or fails, the catch in `checkRepo` skips the repo.

### Step 2 — Shallow clone if hash changed

```ts
async function checkRepo(
  repoUrl: string,
  cache: Cache
): Promise<string[]> {
  const currentHash = await getRemoteHash(repoUrl)
  if (!currentHash) return []

  const cached = cache.repos[repoUrl]
  if (cached?.last_commit_hash === currentHash) {
    // No change — return previously known skills
    return cached.known_skills
  }

  // Hash changed — shallow clone to temp dir
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-skills-"))
  try {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    await $`git clone --depth 1 --quiet ${repoUrl} ${tmpDir}`.env(env)
    const entries = await fs.readdir(tmpDir, { withFileTypes: true })
    const skills = entries
      .filter(e => e.isDirectory() && !e.name.startsWith("."))
      .map(e => e.name)

    // Update cache for this repo
    cache.repos[repoUrl] = { last_commit_hash: currentHash, known_skills: skills }
    return skills
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
```

---

## Local Skills Detection

Skills are installed by `npx skills add` into:
- **Global scope**: `~/.agents/skills/`
- **Project scope**: `.agents/skills/` (relative to workspace root)

`skillsScope` config controls which directories are scanned.

```ts
async function getLocalSkills(
  directory: string,
  scope: "global" | "project" | "both"
): Promise<Set<string>> {
  const skills = new Set<string>()

  const dirs: string[] = []
  if (scope === "global" || scope === "both") {
    dirs.push(path.join(os.homedir(), ".agents/skills"))
  }
  if (scope === "project" || scope === "both") {
    dirs.push(path.join(directory, ".agents/skills"))
  }

  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.isDirectory()) skills.add(e.name)
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  return skills
}
```

---

## Toast Format

`client.tui.showToast` accepts a single `message` string. Multi-line toasts are supported via `\n`.

```ts
const message = [
  "New team skills available!",
  "",
  ...newSkills.map(s => `• ${s.name}  →  npx skills add ${s.repoUrl}`)
].join("\n")

await client.tui.showToast({ body: { message, variant: "success" } })
```

> **To verify during smoke test**: Does `client.tui.showToast` render `\n` in the message? If not, fallback to a condensed single-line format: `"New skills: pr-summarizer, test-runner — run npx skills add <url>"`.

---

## Cache File

```ts
// src/cache.ts
const CACHE_PATH = path.join(os.homedir(), ".config/opencode/skills-notifier-cache.json")

export async function readCache(): Promise<Cache> {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, "utf8"))
  } catch {
    return { last_checked_at: new Date(0).toISOString(), repos: {}, notified_skills: [] }
  }
}

export async function writeCache(cache: Cache): Promise<void> {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2))
}
```

---

## Technical Constraints

| Constraint | Value | Rationale |
|---|---|---|
| `git ls-remote` timeout | 10s | Prevents hanging on slow/unreachable remotes |
| `git clone` timeout | 30s | Shallow clones are fast; 30s is generous |
| `GIT_TERMINAL_PROMPT` | `0` | Prevents interactive prompts that would hang the background process |
| Rate limit | Configurable, default 60min | Prevents hammering remote repos on every launch |
| Clone strategy | `--depth 1` | Only need latest file tree, not history |

---

## Build Setup

```json
// package.json
{
  "name": "opencode-skills-notifier",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": "*"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "latest",
    "typescript": "^5"
  }
}
```

The plugin has **zero runtime dependencies** beyond the peer `@opencode-ai/plugin`. All git ops use the system `git` binary via Bun's `$` shell helper. All file I/O uses Node's built-in `fs/promises`.

---

## Implementation Order

```
Phase 1 — Scaffolding (parallel)
├── package.json + tsconfig.json
└── src/types.ts

Phase 2 — Core modules (parallel after Phase 1)
├── src/config.ts    (readPluginConfig)
├── src/cache.ts     (readCache, writeCache)
└── src/discovery.ts (discoverLocalRepos, getLocalSkills)

Phase 3 — Git checker (sequential, depends on Phase 2)
└── src/checker.ts   (getRemoteHash, checkRepo, spawnCheck)

Phase 4 — Plugin entry (sequential, depends on Phase 3)
└── src/index.ts     (SkillsNotifierPlugin export)

Phase 5 — Manual smoke test
└── Install as local plugin in ~/.config/opencode/plugins/
    configure a test repo in opencode.json, launch opencode
```

---

## Open Questions

1. **Newline rendering in toasts** — Does `client.tui.showToast` render `\n` in the message? Verify during smoke test; fallback format documented in Toast Format section above.

---

## References

- Product spec: [specs.md](./specs.md)
- OpenCode plugin API: https://opencode.ai/docs/plugins
- OpenCode SDK reference: https://opencode.ai/docs/sdk
