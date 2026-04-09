export interface Cache {
  last_checked_at: string
  repos: {
    [url: string]: {
      last_commit_hash: string
      known_skills: string[]
    }
  }
  notified_skills: string[]
}

export interface PluginConfig {
  enabled: boolean
  checkIntervalMinutes: number
  repositories: string[]
  skillsScope: "global" | "project" | "both"
}
