import type { Cache } from "./types.js";
export declare function readCache(): Promise<Cache>;
export declare function writeCache(cache: Cache): Promise<void>;
