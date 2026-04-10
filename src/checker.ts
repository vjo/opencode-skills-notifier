import { $ } from "./shell.js";
import { readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Cache } from "./types.js";
import { readPluginConfig } from "./config.js";
import { readCache, writeCache } from "./cache.js";
import { discoverLocalRepos, getLocalSkills } from "./discovery.js";
import type { createOpencodeClient } from "@opencode-ai/sdk";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function checkRepo(repoUrl: string, cache: Cache): Promise<string[]> {
  // 1. Get current HEAD hash via git ls-remote (timeout 10s)
  let currentHash: string;
  try {
    const output = await withTimeout(
      $`git ls-remote ${repoUrl} HEAD`
        .env({ ...process.env, GIT_TERMINAL_PROMPT: "0" })
        .text(),
      10_000
    );
    currentHash = output.split(/\s/)[0]?.trim() ?? "";
    if (!currentHash) return [];
  } catch {
    return [];
  }

  // 2. Return cached skills if hash is unchanged
  const cached = cache.repos[repoUrl];
  if (cached && cached.last_commit_hash === currentHash) {
    return cached.known_skills;
  }

  // 3. Shallow clone and discover top-level folder names
  const tmpDir = join(
    tmpdir(),
    `skills-notifier-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  try {
    await withTimeout(
      $`git clone --depth 1 --quiet ${repoUrl} ${tmpDir}`
        .env({ ...process.env, GIT_TERMINAL_PROMPT: "0" })
        .quiet(),
      30_000
    );

    const entries = await readdir(tmpDir, { withFileTypes: true });
    const skills = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();

    cache.repos[repoUrl] = { last_commit_hash: currentHash, known_skills: skills };
    return skills;
  } catch {
    return [];
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function spawnCheck(
  client: ReturnType<typeof createOpencodeClient>,
  directory: string
): Promise<void> {
  const config = await readPluginConfig();
  if (!config.enabled) return;

  const cache = await readCache();

  // Rate-limit check
  const lastChecked = new Date(cache.last_checked_at).getTime();
  const intervalMs = config.checkIntervalMinutes * 60_000;
  if (Date.now() - lastChecked < intervalMs) return;

  // Merge and deduplicate repos from config and local discovery
  const discoveredRepos = await discoverLocalRepos(directory);
  const allUrls = [...new Set([...config.repositories, ...discoveredRepos])];

  // Evict notified_skills that are no longer locally installed
  const localSkills = await getLocalSkills(directory, config.skillsScope);
  cache.notified_skills = cache.notified_skills.filter((s) => localSkills.has(s));

  // Check each repo and collect newly discovered skills
  const newSkills: string[] = [];
  for (const url of allUrls) {
    const skills = await checkRepo(url, cache);
    for (const skill of skills) {
      if (!cache.notified_skills.includes(skill)) {
        newSkills.push(skill);
        cache.notified_skills.push(skill);
      }
    }
  }

  cache.last_checked_at = new Date().toISOString();
  await writeCache(cache);

  if (newSkills.length > 0) {
    await client.tui.showToast({
      body: {
        title: "New skills available",
        message: `${newSkills.length} new skill${newSkills.length === 1 ? "" : "s"} available: ${newSkills.join(", ")}`,
        variant: "info",
      },
    }).catch(() => undefined);
  }
}
