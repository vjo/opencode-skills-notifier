import type { Plugin } from "@opencode-ai/plugin";
import { spawnCheck } from "./checker.js";

export const SkillsNotifierPlugin: Plugin = async ({ client, directory }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        spawnCheck(client, directory).catch(() => {});
      }
    },
  };
};
