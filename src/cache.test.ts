import { describe, it, expect, mock } from "bun:test";

const EMPTY_DEFAULT = {
  last_checked_at: "1970-01-01T00:00:00.000Z",
  repos: {},
  notified_skills: [],
};

describe("readCache", () => {
  it("returns empty default when file is missing", async () => {
    mock.module("fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
    }));
    const { readCache } = await import("./cache.ts");
    expect(await readCache()).toEqual(EMPTY_DEFAULT);
  });

  it("returns empty default when file is malformed JSON", async () => {
    mock.module("fs/promises", () => ({
      readFile: () => Promise.resolve("not-json{{{"),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
    }));
    const { readCache } = await import("./cache.ts");
    expect(await readCache()).toEqual(EMPTY_DEFAULT);
  });

  it("round-trip: write then read returns identical Cache object", async () => {
    const stored: Record<string, string> = {};
    mock.module("fs/promises", () => ({
      readFile: (path: string) => {
        if (path in stored) return Promise.resolve(stored[path]);
        return Promise.reject(new Error("ENOENT"));
      },
      writeFile: (path: string, data: string) => {
        stored[path] = data;
        return Promise.resolve();
      },
      rename: (src: string, dest: string) => {
        stored[dest] = stored[src];
        delete stored[src];
        return Promise.resolve();
      },
      mkdir: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
    }));
    const { readCache, writeCache } = await import("./cache.ts");
    const cache = {
      last_checked_at: "2026-01-01T00:00:00.000Z",
      repos: {
        "https://github.com/example/repo": {
          last_commit_hash: "abc123",
          known_skills: ["skill-a", "skill-b"],
        },
      },
      notified_skills: ["skill-a"],
    };
    await writeCache(cache);
    expect(await readCache()).toEqual(cache);
  });
});
