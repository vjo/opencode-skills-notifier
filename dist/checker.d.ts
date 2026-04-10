import type { Cache } from "./types.js";
import type { createOpencodeClient } from "@opencode-ai/sdk";
import type { PluginOptions } from "@opencode-ai/plugin";
export declare function checkRepo(repoUrl: string, cache: Cache): Promise<string[]>;
export declare function spawnCheck(client: ReturnType<typeof createOpencodeClient>, directory: string, options?: PluginOptions): Promise<void>;
