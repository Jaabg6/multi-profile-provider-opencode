import fs from "node:fs/promises";
export interface ShimInstallResult {
    ok: boolean;
    message: string;
}
type FsLike = Pick<typeof fs, "access" | "copyFile" | "readFile" | "rename" | "writeFile">;
export declare function installOpencodeShim(env?: NodeJS.ProcessEnv, fsApi?: FsLike): Promise<ShimInstallResult>;
export declare function uninstallOpencodeShim(env?: NodeJS.ProcessEnv, fsApi?: FsLike): Promise<ShimInstallResult>;
export {};
