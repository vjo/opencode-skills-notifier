import { describe, it, expect, mock, afterAll } from "bun:test";
import type { Cache } from "./types.js";

// Static imports of real modules — used in afterAll to restore module registry
// so that mock.module() calls in this file don't pollute other test files.
import * as realCache from "./cache.ts";
import * as realConfig from "./config.ts";
import * as realDiscovery from "./discovery.ts";
import * as realShell from "./shell.ts";

afterAll(() => {
  mock.module("./cache.ts", () => realCache);
  mock.module("./config.ts", () => realConfig);
  mock.module("./discovery.ts", () => realDiscovery);
  mock.module("./shell.ts", () => realShell);
});

// Builds a fluent ShellPromise-shaped mock that resolves with `textResult` or throws `error`.
function makeCmd(textResult?: string, error?: Error) {
  const cmd: any = {
    env(_e: unknown) {
      return cmd;
    },
    quiet(_q?: boolean) {
      return cmd;
    },
    text() {
      return error ? Promise.reject(error) : Promise.resolve(textResult ?? "");
    },
  };
  // Make the object itself thenable so `await cmd` works (used in clone path).
  cmd.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    error
      ? Promise.reject(error).then(resolve, reject)
      : Promise.resolve({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), exitCode: 0 }).then(
          resolve,
          reject
        );
  cmd.catch = (fn: (e: unknown) => unknown) =>
    error ? Promise.reject(error).catch(fn) : Promise.resolve(cmd);
  cmd.finally = (fn: () => void) =>
    (error ? Promise.reject(error) : Promise.resolve(cmd)).finally(fn);
  return cmd;
}

function makeDirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir };
}

const HASH_A = "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111";
const HASH_B = "bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222";

describe("checkRepo", () => {
  it("returns cached skills when hash unchanged", async () => {
    mock.module("./shell.ts", () => ({
      $: (_strings: TemplateStringsArray, ..._values: unknown[]) =>
        makeCmd(`${HASH_A}\tHEAD\n`),
    }));
    mock.module("node:fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
      rm: () => Promise.resolve(),
    }));
    mock.module("node:os", () => ({ tmpdir: () => "/tmp", homedir: () => "/home/test" }));

    const { checkRepo } = await import("./checker.ts");

    const cache: Cache = {
      repos: {
        "https://github.com/example/repo": {
          last_commit_hash: HASH_A,
          known_skills: ["skill-a", "skill-b"],
        },
      },
      notified_skills: [],
    };

    const result = await checkRepo("https://github.com/example/repo", cache);
    expect(result).toEqual(["skill-a", "skill-b"]);
  });

  it("returns folder names after hash change (mocked git calls)", async () => {
    let callCount = 0;
    mock.module("./shell.ts", () => ({
      $: (_strings: TemplateStringsArray, ..._values: unknown[]) => {
        callCount++;
        if (callCount === 1) {
          // ls-remote call
          return makeCmd(`${HASH_B}\tHEAD\n`);
        }
        // clone call
        return makeCmd();
      },
    }));
    mock.module("node:fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: (_path: string) =>
        Promise.resolve([
          makeDirent(".git", true),
          makeDirent("copywriting", true),
          makeDirent("evals", true),
          makeDirent("README.md", false),
        ]),
      rm: () => Promise.resolve(),
    }));
    mock.module("node:os", () => ({ tmpdir: () => "/tmp", homedir: () => "/home/test" }));

    const { checkRepo } = await import("./checker.ts");

    const cache: Cache = {
      repos: {
        "https://github.com/example/repo": {
          last_commit_hash: HASH_A,
          known_skills: ["old-skill"],
        },
      },
      notified_skills: [],
    };

    const result = await checkRepo("https://github.com/example/repo", cache);
    expect(result).toEqual(["copywriting", "evals"]);
    expect(cache.repos["https://github.com/example/repo"]).toEqual({
      last_commit_hash: HASH_B,
      known_skills: ["copywriting", "evals"],
    });
  });

  it("handles git ls-remote failure silently", async () => {
    mock.module("./shell.ts", () => ({
      $: (_strings: TemplateStringsArray, ..._values: unknown[]) =>
        makeCmd(undefined, new Error("git: command not found")),
    }));
    mock.module("node:fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
      rm: () => Promise.resolve(),
    }));
    mock.module("node:os", () => ({ tmpdir: () => "/tmp", homedir: () => "/home/test" }));

    const { checkRepo } = await import("./checker.ts");

    const cache: Cache = {
      repos: {},
      notified_skills: [],
    };

    const result = await checkRepo("https://github.com/example/repo", cache);
    expect(result).toEqual([]);
  });
});

describe("spawnCheck", () => {
  it("skips when disabled", async () => {
    mock.module("./shell.ts", () => ({
      $: (_strings: TemplateStringsArray, ..._values: unknown[]) => makeCmd(),
    }));
    mock.module("node:fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
      rm: () => Promise.resolve(),
    }));
    mock.module("node:os", () => ({ tmpdir: () => "/tmp", homedir: () => "/home/test" }));
    mock.module("./config.ts", () => ({
      readPluginConfig: () => ({
        enabled: false,
        repositories: [],
        skillsScope: "both",
      }),
    }));

    let writeCacheCalled = false;
    mock.module("./cache.ts", () => ({
      readCache: async () => ({
        repos: {},
        notified_skills: [],
      }),
      writeCache: async () => {
        writeCacheCalled = true;
      },
    }));
    mock.module("./discovery.ts", () => ({
      discoverLocalRepos: async () => [],
      getLocalSkills: async () => new Set<string>(),
    }));

    const { spawnCheck } = await import("./checker.ts");
    const showToast = mock(() => Promise.resolve({ data: true }));
    const client = { tui: { showToast } } as any;

    await spawnCheck(client, "/project");

    expect(writeCacheCalled).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("evicts uninstalled skills from notified_skills", async () => {
    mock.module("./shell.ts", () => ({
      $: (_strings: TemplateStringsArray, ..._values: unknown[]) => makeCmd(),
    }));
    mock.module("node:fs/promises", () => ({
      readFile: () => Promise.reject(new Error("ENOENT")),
      writeFile: () => Promise.resolve(),
      rename: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      unlink: () => Promise.resolve(),
      readdir: () => Promise.resolve([]),
      rm: () => Promise.resolve(),
    }));
    mock.module("node:os", () => ({ tmpdir: () => "/tmp", homedir: () => "/home/test" }));
    mock.module("./config.ts", () => ({
      readPluginConfig: () => ({
        enabled: true,
        repositories: [],
        skillsScope: "project",
      }),
    }));

    let savedCache: Cache | undefined;
    mock.module("./cache.ts", () => ({
      readCache: async (): Promise<Cache> => ({
        repos: {},
        notified_skills: ["installed-skill", "uninstalled-skill"],
      }),
      writeCache: async (c: Cache) => {
        savedCache = c;
      },
    }));
    mock.module("./discovery.ts", () => ({
      discoverLocalRepos: async () => [],
      getLocalSkills: async () => new Set<string>(["installed-skill"]),
    }));

    const { spawnCheck } = await import("./checker.ts");
    const showToast = mock(() => Promise.resolve({ data: true }));
    const client = { tui: { showToast } } as any;

    await spawnCheck(client, "/project");

    // "uninstalled-skill" should have been evicted; "installed-skill" retained
    expect(savedCache?.notified_skills).toEqual(["installed-skill"]);
    expect(showToast).not.toHaveBeenCalled();
  });
});
