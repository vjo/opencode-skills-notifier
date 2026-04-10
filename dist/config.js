const DEFAULTS = {
    enabled: true,
    repositories: [],
    skillsScope: "both",
};
export function readPluginConfig(options) {
    const s = options ?? {};
    const enabled = typeof s["enabled"] === "boolean" ? s["enabled"] : DEFAULTS.enabled;
    const repositories = Array.isArray(s["repositories"])
        ? s["repositories"].filter((r) => typeof r === "string")
        : [...DEFAULTS.repositories];
    const skillsScope = s["skillsScope"] === "global" ||
        s["skillsScope"] === "project" ||
        s["skillsScope"] === "both"
        ? s["skillsScope"]
        : DEFAULTS.skillsScope;
    return { enabled, repositories, skillsScope };
}
