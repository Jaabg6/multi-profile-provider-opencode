#!/usr/bin/env node
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
export declare function runSetupCli(argv: string[], deps?: SetupCliDeps): Promise<number>;
