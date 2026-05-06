#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import { runSetupStack, type SetupDeps } from "@multi-profile-provider/cli/setup-stack";

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

const productName = "Multi Profile Provider for OpenCode";
const setupCommand = "npx @multi-profile-provider/opencode setup";
const plannedChecks = "OpenCode, CLI, plugin, registry, next commands";

function renderHelp(): string[] {
  return [
    productName,
    "",
    `Usage: ${setupCommand}`,
    "",
    "Supported command: setup",
    "Runs the explicit setup flow. Full setup orchestration lands in the next implementation slice."
  ];
}

export function setupSpawnOptions(platform: NodeJS.Platform): SpawnOptionsWithoutStdio {
  return { shell: platform === "win32" };
}

export function createSetupSpawn(platform: NodeJS.Platform, spawnImpl: NodeSpawn = spawn): SetupDeps["spawn"] {
  return async (command, args) =>
    await new Promise((resolveSpawn) => {
      const child = spawnImpl(command, args, setupSpawnOptions(platform));
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.once("error", (error) => resolveSpawn({ code: 1, stdout, stderr: (error as Error).message }));
      child.once("exit", (code) => resolveSpawn({ code: code ?? 0, stdout, stderr }));
    });
}

function createDefaultSetupDeps(write: (message: string) => void): SetupDeps {
  const platform = process.platform;
  return {
    env: process.env,
    platform,
    cwd: process.cwd(),
    homedir: process.env.HOME ?? process.env.USERPROFILE ?? process.cwd(),
    write,
    spawn: createSetupSpawn(platform)
  };
}

async function defaultSetupRunner(write: (message: string) => void, deps?: SetupDeps): Promise<SetupRunnerResult> {
  const result = await runSetupStack({ dryRun: false }, deps ?? createDefaultSetupDeps(write));
  return { code: result.ok ? 0 : 1, lines: [] };
}

export async function runSetupCli(argv: string[], deps: SetupCliDeps = {}): Promise<number> {
  const write = deps.write ?? console.log;
  const [command, ...args] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    for (const line of renderHelp()) write(line);
    return 0;
  }

  if (command !== "setup") {
    write(`Unsupported command: ${command}`);
    for (const line of renderHelp()) write(line);
    return 1;
  }

  write(`${productName} setup`);
  const setupRunner = deps.runSetup ?? (() => defaultSetupRunner(write, deps.createSetupDeps?.(write)));
  const result = await setupRunner(args);
  for (const line of result.lines) write(line);
  return result.code;
}

async function main() {
  process.exitCode = await runSetupCli(process.argv.slice(2));
}

const isDirectInvocation = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (process.env.MPP_SUPPRESS_MAIN !== "1" && isDirectInvocation) {
  void main();
}
