import type { Plugin } from "@opencode-ai/plugin";
import { spawnCheck } from "./checker.js";

export const SkillsNotifierPlugin: Plugin = async ({ client, directory }, options) => {
  spawnCheck(client, directory, options).catch(() => {});
  return {};
};
