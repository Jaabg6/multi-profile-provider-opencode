#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";
import { collectShimDiagnostics, installOpencodeShim, uninstallOpencodeShim } from "./shim.js";

type SpawnLike = typeof spawn;
type LaunchPlan =
  | { command: string; args: string[]; shell: false; windowsVerbatimArguments?: boolean }
  | { command: string; shell: false; windowsVerbatimArguments?: boolean };

function escapeCmdArg(value: string): string {
  if (value.length === 0) return '""';
  const escaped = value.replace(/(["^&|<>])/g, "^$1");
  return /\s/.test(escaped) ? `"${escaped}"` : escaped;
}

function resolveOpencodeLaunch(commandFromShim: string | undefined, args: string[]): LaunchPlan {
  const originalFromShim = commandFromShim?.trim();
  const isWindows = process.platform === "win32";

  if (!isWindows) {
    return {
      command: originalFromShim && originalFromShim.length > 0 ? originalFromShim : "opencode",
      args,
      shell: false
    };
  }

  const backupFromManagedNpmShim = path.resolve(
    path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "npm", "opencode.mpp-original.cmd")
  );
  const opencodeCommand =
    originalFromShim && originalFromShim.length > 0
      ? originalFromShim
      : existsSync(backupFromManagedNpmShim)
        ? backupFromManagedNpmShim
        : "opencode.cmd";
  const normalizedCommand = opencodeCommand
    .replace(/^\\"(.+)\\"$/, "$1")
    .replace(/^"(.+)"$/, "$1");
  const escapedCommand = `"${normalizedCommand.replace(/"/g, '""')}"`;
  const escapedArgs = args.map(escapeCmdArg).join(" ");
  const commandLine = `${escapedCommand}${escapedArgs.length > 0 ? ` ${escapedArgs}` : ""}`;
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
    shell: false,
    windowsVerbatimArguments: true
  };
}

export async function runCli(
  argv: string[],
  write: (message: string) => void = console.log,
  spawnProcess: SpawnLike = spawn
): Promise<void> {
  const [cmd, ...args] = argv;
  const service = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
  switch (cmd) {
    case "status": {
      const profiles = await service.listProfiles();
      const activeProfile = profiles.find((profile) => profile.active);
      const diagnostics = await collectShimDiagnostics(process.env);
      write(`Active profile: ${activeProfile ? `${activeProfile.id} (${activeProfile.label})` : "none"}`);
      write(`Available profiles: ${profiles.length}`);
      write(`Runtime isolation active: ${diagnostics.activeProfileIsolation.enabled ? "yes" : "no"}`);
      write(
        `Runtime markers: profile=${diagnostics.activeProfileIsolation.profileId ?? "<none>"}, root=${diagnostics.activeProfileIsolation.dataRoot ?? "<none>"}`
      );
      write(`Launcher interception: ${diagnostics.launcherInterceptionOk ? "PASS" : "FAIL"}`);
      write(`Interception reason: ${diagnostics.launcherInterceptionReason}`);
      write(`opencode resolved by PATH: ${diagnostics.resolvedOpencodePath ?? "<not found>"}`);
      write(`opencode.cmd resolved by PATH: ${diagnostics.resolvedOpencodeCmdPath ?? "<not found>"}`);
      write(
        `PATH candidates (opencode): ${diagnostics.resolvedOpencodeCandidates.length > 0 ? diagnostics.resolvedOpencodeCandidates.join(" | ") : "<none>"}`
      );
      write(`opencode managed path: ${diagnostics.configuredOpencodePath}`);
      write(`Shim installed at managed path: ${diagnostics.shimInstalledAtConfiguredPath ? "yes" : "no"}`);
      write(`Shim backup present: ${diagnostics.backupExistsAtConfiguredPath ? "yes" : "no"}`);
      write(`Companion bypass path: ${diagnostics.companionBypassPath ?? "<none>"}`);
      write(`Companion shim installed: ${diagnostics.companionShimInstalled ? "yes" : "no"}`);
      write(`Companion backup path: ${diagnostics.companionBackupPath ?? "<none>"}`);
      write(`Companion backup present: ${diagnostics.companionBackupExists ? "yes" : "no"}`);
      if (!diagnostics.launcherInterceptionOk) {
        write("Action: run 'mpp install'. If it still fails, move the managed npm bin directory first in PATH.");
      }
      break;
    }
    case "create":
      write((await service.createProfile({ id: args[0], label: args[1] })).message);
      break;
    case "list":
      write(JSON.stringify(await service.listProfiles(), null, 2));
      break;
    case "select":
      write((await service.selectProfile(args[0])).message);
      break;
    case "rename":
      write((await service.renameProfile(args[0], args[1])).message);
      break;
    case "delete":
      write((await service.softDeleteProfile(args[0])).message);
      break;
    case "runtime": {
      const binding = await service.resolveRuntimeBinding();
      if (!binding) {
        write("No active profile. Select or create one first.");
        break;
      }
      write(JSON.stringify(binding, null, 2));
      break;
    }
    case "profile": {
      const profiles = await service.listProfiles();
      const activeProfile = profiles.find((profile) => profile.active);
      write("=== Multi Profile Provider ===");
      write(`Active profile: ${activeProfile ? `${activeProfile.id} (${activeProfile.label})` : "none"}`);
      write("Profiles:");
      if (profiles.length === 0) {
        write("- No profiles found. Create one with: mpp create <id> <label>");
      } else {
        for (const profile of profiles) {
          write(`- ${profile.id} | ${profile.label} ${profile.active ? "[active]" : ""}`.trim());
        }
      }
      write("Actions:");
      write("- Create: mpp create <id> <label>");
      write("- Select: mpp select <id>");
      write("- Delete: mpp delete <id>");
      write("- Status: mpp status");
      write("Note: selecting a profile only updates metadata now. Restart OpenCode to apply provider auth isolation.");
      break;
    }
    case "install": {
      const result = await installOpencodeShim(process.env);
      write(result.message);
      if (!result.ok) {
        throw new Error(result.message);
      }
      break;
    }
    case "uninstall": {
      const result = await uninstallOpencodeShim(process.env);
      write(result.message);
      if (!result.ok) {
        throw new Error(result.message);
      }
      break;
    }
    case "run": {
      const binding = await service.resolveRuntimeBinding();
      if (!binding) {
        write("No active profile. Select or create one first.");
        break;
      }
      const launch = resolveOpencodeLaunch(process.env.MPP_ORIGINAL_OPENCODE, args);
      const spawnEnv = {
        ...process.env,
        MPP_LAUNCHED_VIA_MPP_RUN: "1",
        ...binding.env
      };
      const child = spawnProcess(launch.command, launch.args, {
        stdio: "inherit",
        shell: false,
        env: spawnEnv,
        windowsVerbatimArguments: launch.windowsVerbatimArguments
      });
      await new Promise<void>((resolve, reject) => {
        child.once("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") {
            reject(
                new Error(
                  "OpenCode executable not found in PATH. Install OpenCode and verify it is available in your terminal."
                )
              );
            return;
          }
          reject(error);
        });
        child.once("exit", (code: number | null) => {
          if (code && code !== 0) {
            reject(
              new Error(
                `OpenCode exited with code ${code}. If OpenCode is not installed, install it and verify 'opencode' is available in PATH.`
              )
            );
            return;
          }
          resolve();
        });
      });
      break;
    }
    default:
      write(
        "Commands: status | profile | create <id> <label> | list | select <id> | rename <id> <label> | delete <id> | runtime | run [opencode-args] | install | uninstall"
      );
  }
}

async function main() {
  await runCli(process.argv.slice(2));
}

void main();
