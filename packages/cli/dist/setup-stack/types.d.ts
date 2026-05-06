import type { RegistryStore } from "@multi-profile-provider/core/registry-store";
export type SetupStepStatus = "planned" | "done" | "skipped" | "failed";
export type SetupStep = {
    name: string;
    status: SetupStepStatus;
    message: string;
    detail?: string;
};
export type SetupArgs = {
    dryRun: boolean;
};
export type SpawnResult = {
    code: number;
    stdout: string;
    stderr: string;
};
export type SpawnOptions = {
    env?: NodeJS.ProcessEnv;
};
export type SpawnLike = (command: string, args: string[], options?: SpawnOptions) => Promise<SpawnResult>;
export type SetupDeps = {
    env: NodeJS.ProcessEnv;
    platform: NodeJS.Platform;
    cwd: string;
    homedir: string;
    spawn: SpawnLike;
    write: (line: string) => void;
    now?: () => Date;
    createRegistryStore?: () => RegistryStore;
};
export type SetupPlan = {
    args: SetupArgs;
    steps: SetupStep[];
};
export type SetupResult = {
    ok: boolean;
    steps: SetupStep[];
};
