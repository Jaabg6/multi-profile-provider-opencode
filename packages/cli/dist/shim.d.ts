import fs from "node:fs/promises";
export interface ShimInstallResult {
    ok: boolean;
    message: string;
}
export interface ShimDiagnostics {
    resolvedOpencodePath: string | null;
    configuredOpencodePath: string;
    shimInstalledAtConfiguredPath: boolean;
    backupExistsAtConfiguredPath: boolean;
    activeProfileIsolation: {
        enabled: boolean;
        profileId?: string;
        dataRoot?: string;
    };
}
type FsLike = Pick<typeof fs, "access" | "copyFile" | "readFile" | "rename" | "writeFile">;
export declare function collectShimDiagnostics(env?: NodeJS.ProcessEnv, fsApi?: FsLike): Promise<ShimDiagnostics>;
export declare function installOpencodeShim(env?: NodeJS.ProcessEnv, fsApi?: FsLike): Promise<ShimInstallResult>;
export declare function uninstallOpencodeShim(env?: NodeJS.ProcessEnv, fsApi?: FsLike): Promise<ShimInstallResult>;
export {};
