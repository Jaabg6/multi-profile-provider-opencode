export type UninstallMode = "plan" | "apply";
export type UninstallStackArgs = {
    mode: UninstallMode;
    apply: boolean;
    full: boolean;
    stopOpencode: boolean;
    removeProfiles: boolean;
    cleanNpmCache: boolean;
    verboseReport: boolean;
    pluginNames: string[];
};
export type SpawnResult = {
    code: number;
    stdout: string;
    stderr: string;
};
export type SpawnLike = (command: string, args: string[]) => Promise<SpawnResult>;
export type UninstallPaths = {
    configRoots: string[];
    stateRoots: string[];
    dataRoots: string[];
    cacheRoots: string[];
    profileRoots: string[];
};
export type UninstallDeps = {
    env: NodeJS.ProcessEnv;
    platform: NodeJS.Platform;
    cwd: string;
    homedir: string;
    spawn: SpawnLike;
    write: (line: string) => void;
    now?: () => Date;
};
export type UninstallPlan = {
    args: UninstallStackArgs;
    paths: UninstallPaths;
};
