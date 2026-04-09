import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type { PluginConfig } from "./types.js";

const CONFIG_FILE = join(homedir(), ".config", "opencode", "opencode.json");
const SECTION_KEY = "opencode-skills-notifier";

const DEFAULTS: PluginConfig = {
  enabled: true,
  checkIntervalMinutes: 60,
  repositories: [],
  skillsScope: "both",
};

function defaults(): PluginConfig {
  return { ...DEFAULTS, repositories: [...DEFAULTS.repositories] };
}

export async function readPluginConfig(): Promise<PluginConfig> {
  let raw: string;
  try {
    raw = await readFile(CONFIG_FILE, "utf-8");
  } catch {
    return defaults();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !(SECTION_KEY in parsed)
  ) {
    return defaults();
  }

  const section = (parsed as Record<string, unknown>)[SECTION_KEY];
  if (typeof section !== "object" || section === null) {
    return defaults();
  }

  const s = section as Record<string, unknown>;

  const enabled =
    typeof s["enabled"] === "boolean" ? s["enabled"] : DEFAULTS.enabled;

  const checkIntervalMinutes =
    typeof s["checkIntervalMinutes"] === "number" &&
    s["checkIntervalMinutes"] > 0
      ? s["checkIntervalMinutes"]
      : DEFAULTS.checkIntervalMinutes;

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

  return { enabled, checkIntervalMinutes, repositories, skillsScope };
}
