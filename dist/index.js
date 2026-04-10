import { spawnCheck } from "./checker.js";
export const SkillsNotifierPlugin = async ({ client, directory }) => {
    return {
        event: async ({ event }) => {
            if (event.type === "session.created") {
                spawnCheck(client, directory).catch(() => { });
            }
        },
    };
};
