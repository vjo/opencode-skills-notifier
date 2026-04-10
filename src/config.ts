import type { PluginOptions } from "@opencode-ai/plugin";
import type { PluginConfig } from "./types.js";

const DEFAULTS: PluginConfig = {
  enabled: true,
  repositories: [],
  skillsScope: "both",
};

export function readPluginConfig(options?: PluginOptions): PluginConfig {
  const s = options ?? {};

  const enabled =
    typeof s["enabled"] === "boolean" ? s["enabled"] : DEFAULTS.enabled;

  const repositories = Array.isArray(s["repositories"])
    ? (s["repositories"] as unknown[]).filter(
        (r): r is string => typeof r === "string"
      )
    : [...DEFAULTS.repositories];

  const skillsScope =
    s["skillsScope"] === "global" ||
    s["skillsScope"] === "project" ||
    s["skillsScope"] === "both"
      ? s["skillsScope"]
      : DEFAULTS.skillsScope;

  return { enabled, repositories, skillsScope };
}
