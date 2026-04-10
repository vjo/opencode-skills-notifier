import type { PluginConfig } from "./types.js";
export declare function getLocalSkills(directory: string, scope: PluginConfig["skillsScope"]): Promise<Set<string>>;
export declare function discoverLocalRepos(directory: string): Promise<string[]>;
