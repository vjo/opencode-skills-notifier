import { spawnCheck } from "./checker.js";
export const SkillsNotifierPlugin = async ({ client, directory }, options) => {
    spawnCheck(client, directory, options).catch(() => { });
    return {};
};
