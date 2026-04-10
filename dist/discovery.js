import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
async function scanSkillsDir(dir) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        const skills = new Set();
        for (const entry of entries) {
            if (entry.isDirectory()) {
                skills.add(entry.name);
            }
        }
        return skills;
    }
    catch {
        return new Set();
    }
}
export async function getLocalSkills(directory, scope) {
    const globalDir = join(homedir(), ".agents", "skills");
    const projectDir = join(directory, ".agents", "skills");
    if (scope === "global") {
        return scanSkillsDir(globalDir);
    }
    if (scope === "project") {
        return scanSkillsDir(projectDir);
    }
    // both
    const [globalSkills, projectSkills] = await Promise.all([
        scanSkillsDir(globalDir),
        scanSkillsDir(projectDir),
    ]);
    return new Set([...globalSkills, ...projectSkills]);
}
function extractOriginUrl(gitConfig) {
    const lines = gitConfig.split("\n");
    let inOriginSection = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[remote "origin"]') {
            inOriginSection = true;
            continue;
        }
        if (inOriginSection) {
            if (trimmed.startsWith("[")) {
                break;
            }
            const match = trimmed.match(/^url\s*=\s*(.+)$/);
            if (match) {
                return match[1].trim().replace(/\r$/, "");
            }
        }
    }
    return null;
}
export async function discoverLocalRepos(directory) {
    const skillsDir = join(directory, ".agents", "skills");
    let entries;
    try {
        entries = await readdir(skillsDir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const urls = new Set();
    await Promise.all(entries
        .filter((e) => e.isDirectory())
        .map(async (entry) => {
        const gitConfigPath = join(skillsDir, entry.name, ".git", "config");
        try {
            const content = await readFile(gitConfigPath, "utf-8");
            const url = extractOriginUrl(content);
            if (url)
                urls.add(url);
        }
        catch {
            // no .git/config, skip
        }
    }));
    return [...urls];
}
