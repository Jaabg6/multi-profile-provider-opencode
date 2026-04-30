#!/usr/bin/env node
import { spawn } from "node:child_process";
type SpawnLike = typeof spawn;
export declare function normalizeCliArgv(argv: string[], invokedAs?: string | undefined): string[];
export declare function runCli(argv: string[], write?: (message: string) => void, spawnProcess?: SpawnLike): Promise<void>;
export {};
