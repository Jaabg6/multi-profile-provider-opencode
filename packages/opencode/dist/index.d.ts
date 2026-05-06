#!/usr/bin/env node
import { type SpawnOptionsWithoutStdio } from "node:child_process";
import { type SetupDeps } from "@multi-profile-provider/cli/setup-stack";
export type SetupRunnerResult = {
    code: number;
    lines: string[];
};
export type SetupRunner = (args: string[]) => Promise<SetupRunnerResult>;
export type SetupCliDeps = {
    write?: (message: string) => void;
    runSetup?: SetupRunner;
    createSetupDeps?: (write: (message: string) => void) => SetupDeps;
};
export declare function setupSpawnOptions(platform: NodeJS.Platform): SpawnOptionsWithoutStdio;
export declare function createSetupSpawn(platform: NodeJS.Platform, spawnImpl?: typeof import("node:child_process").spawn): SetupDeps["spawn"];
export declare function runSetupCli(argv: string[], deps?: SetupCliDeps): Promise<number>;
