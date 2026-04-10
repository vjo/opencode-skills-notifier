import { describe, it, expect } from "bun:test";
import { readPluginConfig } from "./config.ts";

describe("readPluginConfig", () => {
  const DEFAULTS = {
    enabled: true,
    repositories: [],
    skillsScope: "both" as const,
  };

  it("returns defaults when called with no options", () => {
    expect(readPluginConfig()).toEqual(DEFAULTS);
    expect(readPluginConfig(undefined)).toEqual(DEFAULTS);
    expect(readPluginConfig({})).toEqual(DEFAULTS);
  });

  it("merges partial config with defaults", () => {
    expect(readPluginConfig({ enabled: false })).toEqual({
      ...DEFAULTS,
      enabled: false,
    });
  });

  it("parses all fields correctly when full config is present", () => {
    expect(
      readPluginConfig({
        enabled: false,
        repositories: ["https://github.com/foo/bar"],
        skillsScope: "global",
      })
    ).toEqual({
      enabled: false,
      repositories: ["https://github.com/foo/bar"],
      skillsScope: "global",
    });
  });

  it("falls back to defaults for invalid field values", () => {
    expect(
      readPluginConfig({
        enabled: "yes" as any,
        repositories: "not-an-array" as any,
        skillsScope: "unknown" as any,
      })
    ).toEqual(DEFAULTS);
  });
});
