# OpenCode Skills Notifier Plugin - Product Specification

## Overview

In team environments, skills (custom tools/agents) are shared via Git repositories. There is no automated way for developers to discover newly added skills, causing "tooling drift" where team members are unaware of capabilities added by colleagues. This plugin runs as a global OpenCode plugin to detect new skills in configured repositories and notify users on launch.

## Goals

- Automatically detect new skills in remote repositories without requiring manual `git pull`
- Allow teams to pre-configure repository URLs so new hires are notified of available skills on first launch
- Launch OpenCode in under 300ms by running all remote checks asynchronously in the background
- Track both explicitly configured repos (team-wide) and repos discovered from the local workspace

## Non-Goals

- Automatic installation of new skills — user must explicitly run the install command (security boundary)
- Managing Git credentials — the plugin delegates to the user's existing local Git/SSH agent
- Intercepting or replacing the existing `/skills` OpenCode command — the plugin is notification-only

## Users

- **Primary**: Developers on teams that share skills via Git monorepos
- **Secondary**: New hires being onboarded who need zero-config discovery of team tooling

## User Stories

- As a developer, I want to be notified when a teammate publishes a new skill so I don't miss team tooling
- As a new hire, I want to open OpenCode and immediately know what shared skills my team uses and how to install them
- As a team lead, I want to configure a list of repos once in global config so all team members get notified automatically

---

## Screens & Navigation

The plugin has no dedicated UI screen. All interaction is through the toast notification only — the plugin does **not** intercept or replace the existing `/skills` OpenCode command.

| Surface            | Entry From                     | Description                                                               |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------- |
| Toast notification | Automatic on `session.created` | Lists newly available skills with their install commands inline           |

---

## UI/UX

### Toast Notification

Appears automatically when the background check discovers one or more uninstalled remote skills.

**Structure**:
```
🚀 New team skills available!

• pr-summarizer  →  npx skills add git@github.com:org/repo.git
• test-runner    →  npx skills add git@github.com:org/repo.git
```

- **Trigger**: Background check completes and finds ≥1 skill present on remote but missing locally
- **Content**: Each new skill is listed by name with its `npx skills add <url>` install command, where `<url>` is the repository URL as configured in `opencode-skills-notifier.repositories[]`
- **Persistence**: Reappears on every subsequent launch until all listed skills are installed locally
- **Non-blocking**: Must not interrupt or delay OpenCode's normal startup flow

**No toast shown when**:

- All remote skills are already installed locally
- The background check has not yet completed (check runs concurrently with startup)
- The plugin is offline or a repo is unreachable (fail silently)

---

## Configuration

The plugin reads from `~/.config/opencode/config.json`:

```json
{
  "plugins": ["opencode-skills-notifier"],
  "opencode-skills-notifier": {
    "enabled": true,
    "checkIntervalMinutes": 60,
    "repositories": ["git@github.com:your-org/ai-skills-monorepo.git", "git@gitlab.company.com:platform/dev-tools.git"]
  }
}
```

| Field                  | Default | Description                                |
| ---------------------- | ------- | ------------------------------------------ |
| `enabled`              | `true`  | Set to `false` to fully disable the plugin |
| `checkIntervalMinutes` | `60`    | Minimum time between remote checks         |
| `repositories`         | `[]`    | Explicit list of skill repo URLs to track  |

---

## Hybrid Repository Discovery

The plugin aggregates repositories to check from two sources and deduplicates:

1. **Explicit config** — `repositories` array in `config.json` (team-wide, set by lead or onboarding scripts)
2. **Implicit discovery** — scans the current workspace's `.agents/` directory and `package.json` for URLs of already-installed skills

The merged unique set of URLs is what gets checked on each run.

---

## Background Check Behavior

### Timing

- Triggered immediately on `session.created` (no delay, even on first launch)
- Subsequent checks are rate-limited by `checkIntervalMinutes` using `last_checked_at` in the cache file
- Check is fire-and-forget — never awaited, never blocks UI

### Two-Tier Remote Check

**Tier 1 — Manifest (preferred)**:
Fetch `skills-index.json` from the remote repo's main branch via lightweight HTTP. If found, use it to get the full skill list and descriptions.

**Tier 2 — Git fallback**:
If no manifest exists, run `git ls-remote <url> HEAD` to get the latest commit hash. If the hash differs from the cached value, perform a `--depth 1` shallow clone to a temp directory and compare folder names against the locally installed set.

### Conflict Resolution

If a remote skill folder name matches a locally installed skill folder name, it is treated as already installed — regardless of which repo it came from. No further action is taken.

### Silent Failure

If any repo is unreachable (offline, auth failure, timeout), the plugin skips that repo and continues. No error is surfaced to the user. `GIT_TERMINAL_PROMPT=0` is set on all Git subprocess calls to prevent interactive prompts that would hang the background process.

---

## Notifications

| Event                   | Channel        | Condition                                          | Content                                              |
| ----------------------- | -------------- | -------------------------------------------------- | ---------------------------------------------------- |
| New skills found        | Toast (in-app) | Background check finds ≥1 skill missing locally    | Skill names + `npx skills add` command for each      |
| Existing skills updated | —              | Silent                                             | No notification — updates run in background silently |

---

## Cache File

- **Location**: `~/.config/opencode/skills-notifier-cache.json`
- **Contents**: `last_checked_at` timestamp, last-seen remote commit hashes per repo, set of skill identifiers already seen (to track what's been shown in the toast)

---

## Edge Cases

| Scenario                                                                 | Behavior                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| First launch (no cache)                                                  | Check runs immediately; no rate limiting applies                                  |
| User opens multiple terminal panes simultaneously                        | `last_checked_at` prevents duplicate checks within the interval                   |
| Repo is unreachable / user is offline                                    | Skip silently, no error shown                                                     |
| Auth prompt would be required for a repo                                 | `GIT_TERMINAL_PROMPT=0` causes the Git command to fail immediately; skip silently |
| Remote skill has same folder name as a local skill from a different repo | Treated as installed (no notification)           |
| Plugin is disabled (`enabled: false`)                                    | Plugin returns immediately, no checks, no toast  |

---

## Error Handling

| Error                              | Behavior                                                       | User Impact      |
| ---------------------------------- | -------------------------------------------------------------- | ---------------- |
| Repo unreachable / network timeout | Skipped silently                                               | None             |
| Git auth prompt required           | `GIT_TERMINAL_PROMPT=0` causes immediate failure; repo skipped | None             |
| Malformed `skills-index.json`      | Skip Tier 1, fall back to Tier 2                               | None             |
| Config file missing or malformed   | Plugin uses defaults (empty repo list)                         | No notifications |
| Temp directory creation fails      | Skip that repo                                                 | None             |

No error stack traces or console errors are surfaced to the user under any failure condition.

---

## Rollout

- Host source code on GitHub (`your-username/opencode-skills-notifier`)
- Publish to NPM for versioned installs
- Users opt in by adding the package name to their `plugins` array in `~/.config/opencode/config.json`
- No feature flags required — the `enabled: false` config key serves as the kill switch

---

## Open Questions

- What is the timeout threshold for Tier 2 `git ls-remote` calls before giving up on a repo?
- Should the plugin support a `--verbose` or debug mode for troubleshooting during development?
- Should the toast persist until dismissed (even within the same session), or appear once at startup and then clear?

---

## Future Considerations

- A `skills-index.json` authoring guide / schema so repo owners can provide rich metadata (descriptions, tags, required permissions)
- Support for private registries beyond Git SSH (e.g., internal artifact registries)
- Team-level "required skills" enforcement with a different visual treatment (e.g., "🔴 Required — not installed")
- Skill version tracking — notify when a newer version of an installed skill is available

## References

- Technical plan: [plan.md](./plan.md)
