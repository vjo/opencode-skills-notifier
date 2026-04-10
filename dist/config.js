import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
const CONFIG_FILE = join(homedir(), ".config", "opencode", "opencode.json");
const SECTION_KEY = "opencode-skills-notifier";
const DEFAULTS = {
    enabled: true,
    checkIntervalMinutes: 60,
    repositories: [],
    skillsScope: "both",
};
function defaults() {
    return { ...DEFAULTS, repositories: [...DEFAULTS.repositories] };
}
export async function readPluginConfig() {
    let raw;
    try {
        raw = await readFile(CONFIG_FILE, "utf-8");
    }
    catch {
        return defaults();
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return defaults();
    }
    if (typeof parsed !== "object" ||
        parsed === null ||
        !(SECTION_KEY in parsed)) {
        return defaults();
    }
    const section = parsed[SECTION_KEY];
    if (typeof section !== "object" || section === null) {
        return defaults();
    }
    const s = section;
    const enabled = typeof s["enabled"] === "boolean" ? s["enabled"] : DEFAULTS.enabled;
    const checkIntervalMinutes = typeof s["checkIntervalMinutes"] === "number" &&
        s["checkIntervalMinutes"] > 0
        ? s["checkIntervalMinutes"]
        : DEFAULTS.checkIntervalMinutes;
    const repositories = Array.isArray(s["repositories"])
        ? s["repositories"].filter((r) => typeof r === "string")
        : [...DEFAULTS.repositories];
    const skillsScope = s["skillsScope"] === "global" ||
        s["skillsScope"] === "project" ||
        s["skillsScope"] === "both"
        ? s["skillsScope"]
        : DEFAULTS.skillsScope;
    return { enabled, checkIntervalMinutes, repositories, skillsScope };
}
