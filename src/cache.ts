import { readFile, writeFile, rename, mkdir, unlink } from "fs/promises";
import { homedir } from "os";
import { join, dirname } from "path";
import type { Cache } from "./types.js";

const CACHE_FILE = join(
  homedir(),
  ".config",
  "opencode",
  "skills-notifier-cache.json"
);

function defaults(): Cache {
  return {
    last_checked_at: "1970-01-01T00:00:00.000Z",
    repos: {},
    notified_skills: [],
  };
}

export async function readCache(): Promise<Cache> {
  let raw: string;
  try {
    raw = await readFile(CACHE_FILE, "utf-8");
  } catch {
    return defaults();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults();
  }

  if (typeof parsed !== "object" || parsed === null) {
    return defaults();
  }

  const p = parsed as Record<string, unknown>;

  const last_checked_at =
    typeof p["last_checked_at"] === "string" &&
    !isNaN(Date.parse(p["last_checked_at"]))
      ? p["last_checked_at"]
      : defaults().last_checked_at;

  const repos: Cache["repos"] = {};
  if (typeof p["repos"] === "object" && p["repos"] !== null && !Array.isArray(p["repos"])) {
    for (const [url, entry] of Object.entries(
      p["repos"] as Record<string, unknown>
    )) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const last_commit_hash =
        typeof e["last_commit_hash"] === "string" ? e["last_commit_hash"] : "";
      const known_skills = Array.isArray(e["known_skills"])
        ? (e["known_skills"] as unknown[]).filter(
            (s): s is string => typeof s === "string"
          )
        : [];
      repos[url] = { last_commit_hash, known_skills };
    }
  }

  const notified_skills = Array.isArray(p["notified_skills"])
    ? (p["notified_skills"] as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];

  return { last_checked_at, repos, notified_skills };
}

export async function writeCache(cache: Cache): Promise<void> {
  const dir = dirname(CACHE_FILE);
  const tmp = CACHE_FILE + ".tmp";
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify(cache, null, 2), "utf-8");
  try {
    await rename(tmp, CACHE_FILE);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}
