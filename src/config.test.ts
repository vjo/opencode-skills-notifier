import { describe, it, expect, mock } from "bun:test";

// We'll test readPluginConfig by mocking the fs/promises module
// Bun supports mock.module for this purpose

describe("readPluginConfig", () => {
  const DEFAULTS = {
    enabled: true,
    checkIntervalMinutes: 60,
    repositories: [],
    skillsScope: "both" as const,
  };

  it("returns defaults when config file is missing", async () => {
    mock.module("fs/promises", () => ({
      readFile: async () => {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      },
    }));

    const { readPluginConfig } = await import("./config.ts");
    const result = await readPluginConfig();
    expect(result).toEqual(DEFAULTS);
  });

  it("returns defaults when opencode-skills-notifier section is absent", async () => {
    mock.module("fs/promises", () => ({
      readFile: async () => JSON.stringify({ "some-other-plugin": {} }),
    }));

    const { readPluginConfig } = await import("./config.ts");
    const result = await readPluginConfig();
    expect(result).toEqual(DEFAULTS);
  });

  it("merges partial config with defaults", async () => {
    mock.module("fs/promises", () => ({
      readFile: async () =>
        JSON.stringify({
          "opencode-skills-notifier": {
            enabled: false,
          },
        }),
    }));

    const { readPluginConfig } = await import("./config.ts");
    const result = await readPluginConfig();
    expect(result).toEqual({
      ...DEFAULTS,
      enabled: false,
    });
  });

  it("parses all fields correctly when full config is present", async () => {
    mock.module("fs/promises", () => ({
      readFile: async () =>
        JSON.stringify({
          "opencode-skills-notifier": {
            enabled: false,
            checkIntervalMinutes: 30,
            repositories: ["https://github.com/foo/bar"],
            skillsScope: "global",
          },
        }),
    }));

    const { readPluginConfig } = await import("./config.ts");
    const result = await readPluginConfig();
    expect(result).toEqual({
      enabled: false,
      checkIntervalMinutes: 30,
      repositories: ["https://github.com/foo/bar"],
      skillsScope: "global",
    });
  });
});
