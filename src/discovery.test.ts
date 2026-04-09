import { describe, it, expect, mock } from "bun:test";

const GIT_CONFIG_WITH_ORIGIN = `[core]
\trepositoryformatversion = 0
\tfilemode = true
[remote "origin"]
\turl = https://github.com/example/skills-repo
\tfetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
\tremote = origin
`;

const GIT_CONFIG_NO_ORIGIN = `[core]
\trepositoryformatversion = 0
`;

function makeDirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir };
}

describe("getLocalSkills", () => {
  it("returns skill names from mocked project directory", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/project/.agents/skills") {
          return Promise.resolve([
            makeDirent("copywriting", true),
            makeDirent("evals", true),
            makeDirent("README.md", false),
          ]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: () => Promise.reject(new Error("ENOENT")),
    }));
    const { getLocalSkills } = await import("./discovery.ts");
    const result = await getLocalSkills("/project", "project");
    expect(result).toEqual(new Set(["copywriting", "evals"]));
  });

  it("returns empty set when directory does not exist", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: () => Promise.reject(new Error("ENOENT")),
      readFile: () => Promise.reject(new Error("ENOENT")),
    }));
    const { getLocalSkills } = await import("./discovery.ts");
    const result = await getLocalSkills("/nonexistent", "project");
    expect(result).toEqual(new Set());
  });

  it("returns union of global and project for scope=both", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/home/testuser/.agents/skills") {
          return Promise.resolve([makeDirent("global-skill", true)]);
        }
        if (path === "/project/.agents/skills") {
          return Promise.resolve([makeDirent("project-skill", true)]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: () => Promise.reject(new Error("ENOENT")),
    }));
    const { getLocalSkills } = await import("./discovery.ts");
    const result = await getLocalSkills("/project", "both");
    expect(result).toEqual(new Set(["global-skill", "project-skill"]));
  });

  it("deduplicates skills present in both global and project for scope=both", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: () =>
        Promise.resolve([makeDirent("shared-skill", true)]),
      readFile: () => Promise.reject(new Error("ENOENT")),
    }));
    const { getLocalSkills } = await import("./discovery.ts");
    const result = await getLocalSkills("/project", "both");
    expect(result).toEqual(new Set(["shared-skill"]));
  });
});

describe("discoverLocalRepos", () => {
  it("extracts git remote URLs from .git/config", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/project/.agents/skills") {
          return Promise.resolve([makeDirent("copywriting", true)]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: (path: string) => {
        if (path === "/project/.agents/skills/copywriting/.git/config") {
          return Promise.resolve(GIT_CONFIG_WITH_ORIGIN);
        }
        return Promise.reject(new Error("ENOENT"));
      },
    }));
    const { discoverLocalRepos } = await import("./discovery.ts");
    const result = await discoverLocalRepos("/project");
    expect(result).toEqual(["https://github.com/example/skills-repo"]);
  });

  it("deduplicates identical URLs from multiple skills", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/project/.agents/skills") {
          return Promise.resolve([
            makeDirent("skill-a", true),
            makeDirent("skill-b", true),
          ]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: () => Promise.resolve(GIT_CONFIG_WITH_ORIGIN),
    }));
    const { discoverLocalRepos } = await import("./discovery.ts");
    const result = await discoverLocalRepos("/project");
    expect(result).toEqual(["https://github.com/example/skills-repo"]);
  });

  it("returns [] when .agents/skills/ does not exist", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: () => Promise.reject(new Error("ENOENT")),
      readFile: () => Promise.reject(new Error("ENOENT")),
    }));
    const { discoverLocalRepos } = await import("./discovery.ts");
    const result = await discoverLocalRepos("/nonexistent");
    expect(result).toEqual([]);
  });

  it("skips skill directories with no .git/config", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/project/.agents/skills") {
          return Promise.resolve([
            makeDirent("with-git", true),
            makeDirent("without-git", true),
          ]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: (path: string) => {
        if (path === "/project/.agents/skills/with-git/.git/config") {
          return Promise.resolve(GIT_CONFIG_WITH_ORIGIN);
        }
        return Promise.reject(new Error("ENOENT"));
      },
    }));
    const { discoverLocalRepos } = await import("./discovery.ts");
    const result = await discoverLocalRepos("/project");
    expect(result).toEqual(["https://github.com/example/skills-repo"]);
  });

  it("skips skills whose .git/config has no [remote origin]", async () => {
    mock.module("os", () => ({ homedir: () => "/home/testuser" }));
    mock.module("node:fs/promises", () => ({
      readdir: (path: string) => {
        if (path === "/project/.agents/skills") {
          return Promise.resolve([makeDirent("no-remote", true)]);
        }
        return Promise.reject(new Error("ENOENT"));
      },
      readFile: () => Promise.resolve(GIT_CONFIG_NO_ORIGIN),
    }));
    const { discoverLocalRepos } = await import("./discovery.ts");
    const result = await discoverLocalRepos("/project");
    expect(result).toEqual([]);
  });
});
