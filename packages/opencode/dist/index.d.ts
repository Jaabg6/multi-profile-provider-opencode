#!/usr/bin/env node
import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
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
type NodeSpawn = typeof spawn;
export declare function setupSpawnOptions(platform: NodeJS.Platform): SpawnOptionsWithoutStdio;
export declare function createSetupSpawn(platform: NodeJS.Platform, spawnImpl?: NodeSpawn): SetupDeps["spawn"];
export declare function runSetupCli(argv: string[], deps?: SetupCliDeps): Promise<number>;
export {};
