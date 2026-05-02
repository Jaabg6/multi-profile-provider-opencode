import type { UninstallPaths } from "./types.js";
type ResolveInput = {
    platform: NodeJS.Platform;
    env: NodeJS.ProcessEnv;
    cwd: string;
    homedir: string;
};
export declare function resolveUninstallPaths(input: ResolveInput): UninstallPaths;
export {};
