#!/usr/bin/env node
import { spawn } from "node:child_process";
type SpawnLike = typeof spawn;
/**
 * On Windows, .cmd batch scripts cannot be spawned directly with shell:false
 * because CreateProcessW cannot interpret them without cmd.exe.
 * This helper wraps any .cmd command with `cmd.exe /d /s /c` transparently.
 */
export declare function resolveSpawnCommand(command: string, args: string[]): {
    command: string;
    args: string[];
};
export declare function normalizeCliArgv(argv: string[], invokedAs?: string | undefined): string[];
export declare function runCli(argv: string[], write?: (message: string) => void, spawnProcess?: SpawnLike): Promise<void>;
export {};
