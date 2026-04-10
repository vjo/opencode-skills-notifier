export interface Cache {
    repos: {
        [url: string]: {
            last_commit_hash: string;
            known_skills: string[];
        };
    };
    notified_skills: string[];
}
export interface PluginConfig {
    enabled: boolean;
    repositories: string[];
    skillsScope: "global" | "project" | "both";
}
