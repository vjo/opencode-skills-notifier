import { $ } from "./shell.js";
import { readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPluginConfig } from "./config.js";
import { readCache, writeCache } from "./cache.js";
import { discoverLocalRepos, getLocalSkills } from "./discovery.js";
function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
export async function checkRepo(repoUrl, cache) {
    // 1. Get current HEAD hash via git ls-remote (timeout 10s)
    let currentHash;
    try {
        const output = await withTimeout($ `git ls-remote ${repoUrl} HEAD`
            .env({ ...process.env, GIT_TERMINAL_PROMPT: "0" })
            .text(), 10_000);
        currentHash = output.split(/\s/)[0]?.trim() ?? "";
        if (!currentHash)
            return [];
    }
    catch {
        return [];
    }
    // 2. Return cached skills if hash is unchanged
    const cached = cache.repos[repoUrl];
    if (cached && cached.last_commit_hash === currentHash) {
        return cached.known_skills;
    }
    // 3. Shallow clone and discover top-level folder names
    const tmpDir = join(tmpdir(), `skills-notifier-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
        await withTimeout($ `git clone --depth 1 --quiet ${repoUrl} ${tmpDir}`
            .env({ ...process.env, GIT_TERMINAL_PROMPT: "0" })
            .quiet(), 30_000);
        const entries = await readdir(tmpDir, { withFileTypes: true });
        const skills = entries
            .filter((e) => e.isDirectory() && !e.name.startsWith("."))
            .map((e) => e.name)
            .sort();
        cache.repos[repoUrl] = { last_commit_hash: currentHash, known_skills: skills };
        return skills;
    }
    catch {
        return [];
    }
    finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
}
export async function spawnCheck(client, directory, options) {
    const config = readPluginConfig(options);
    if (!config.enabled)
        return;
    const cache = await readCache();
    // Merge and deduplicate repos from config and local discovery
    const discoveredRepos = await discoverLocalRepos(directory);
    const allUrls = [...new Set([...config.repositories, ...discoveredRepos])];
    // Evict notified_skills that are no longer locally installed
    const localSkills = await getLocalSkills(directory, config.skillsScope);
    cache.notified_skills = cache.notified_skills.filter((s) => localSkills.has(s));
    // Check each repo and collect newly discovered skills grouped by repo
    const newByRepo = [];
    for (const url of allUrls) {
        const skills = await checkRepo(url, cache);
        const fresh = skills.filter((s) => !cache.notified_skills.includes(s));
        if (fresh.length > 0) {
            newByRepo.push({ url, skills: fresh });
            cache.notified_skills.push(...fresh);
        }
    }
    await writeCache(cache);
    if (newByRepo.length > 0) {
        const allNewSkills = newByRepo.flatMap((r) => r.skills);
        const installCmds = newByRepo.map((r) => `npx skills add ${r.url}`).join(" | ");
        const message = `Skills: ${allNewSkills.join(", ")} — ${installCmds}`;
        await client.tui.showToast({
            body: {
                title: "New skills available",
                message,
                variant: "info",
            },
        }).catch(() => undefined);
    }
}
