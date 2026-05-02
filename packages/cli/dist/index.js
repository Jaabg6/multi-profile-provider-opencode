#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";
import { parseUninstallStackArgs } from "./uninstall-stack/args.js";
import { createUninstallPlan, executeUninstallPlan } from "./uninstall-stack/service.js";
function escapeCmdArg(value) {
    if (value.length === 0)
        return '""';
    const escaped = value.replace(/(["^&|<>])/g, "^$1");
    return /\s/.test(escaped) ? `"${escaped}"` : escaped;
}
/**
 * On Windows, .cmd batch scripts cannot be spawned directly with shell:false
 * because CreateProcessW cannot interpret them without cmd.exe.
 * This helper wraps any .cmd command with `cmd.exe /d /s /c` transparently.
 */
export function resolveSpawnCommand(command, args) {
    if (process.platform === "win32" && command.toLowerCase().endsWith(".cmd")) {
        return { command: "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
    }
    return { command, args };
}
export function normalizeCliArgv(argv, invokedAs = process.argv[1]) {
    const executableName = path.basename(invokedAs ?? "").toLowerCase();
    const configuredLauncherName = (process.env.MPP_LAUNCHER_COMMAND ?? "").trim().toLowerCase();
    const invokedAsLauncher = executableName === "opencode-mpp" ||
        executableName === "opencode-mpp.cmd" ||
        executableName === "opencode-mpp.exe" ||
        executableName === "opencode-mpp.ps1" ||
        (configuredLauncherName.length > 0 && executableName === configuredLauncherName);
    return invokedAsLauncher ? ["run", ...argv] : argv;
}
function resolveOpencodeLaunch(args) {
    const isWindows = process.platform === "win32";
    if (!isWindows) {
        return {
            command: "opencode",
            args,
            shell: false
        };
    }
    const normalizedCommand = "opencode.cmd";
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
export async function runCli(argv, write = console.log, spawnProcess = spawn) {
    const [cmd, ...args] = argv;
    const service = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
    switch (cmd) {
        case "uninstall-stack": {
            const uninstallArgs = parseUninstallStackArgs(args);
            const plan = await createUninstallPlan(uninstallArgs, {
                env: process.env,
                platform: process.platform,
                cwd: process.cwd(),
                homedir: process.env.HOME ?? process.env.USERPROFILE ?? process.cwd(),
                write,
                spawn: async (command, spawnArgs) => {
                    const resolved = resolveSpawnCommand(command, spawnArgs);
                    return await new Promise((resolve, reject) => {
                        const child = spawnProcess(resolved.command, resolved.args, { shell: false });
                        let stdout = "";
                        let stderr = "";
                        child.stdout?.on("data", (chunk) => {
                            stdout += String(chunk);
                        });
                        child.stderr?.on("data", (chunk) => {
                            stderr += String(chunk);
                        });
                        child.once("error", reject);
                        child.once("exit", (code) => resolve({ code: code ?? 0, stdout, stderr }));
                    });
                }
            });
            await executeUninstallPlan(plan, {
                env: process.env,
                platform: process.platform,
                cwd: process.cwd(),
                homedir: process.env.HOME ?? process.env.USERPROFILE ?? process.cwd(),
                write,
                spawn: async (command, spawnArgs) => {
                    const resolved = resolveSpawnCommand(command, spawnArgs);
                    return await new Promise((resolve, reject) => {
                        const child = spawnProcess(resolved.command, resolved.args, { shell: false });
                        let stdout = "";
                        let stderr = "";
                        child.stdout?.on("data", (chunk) => {
                            stdout += String(chunk);
                        });
                        child.stderr?.on("data", (chunk) => {
                            stderr += String(chunk);
                        });
                        child.once("error", reject);
                        child.once("exit", (code) => resolve({ code: code ?? 0, stdout, stderr }));
                    });
                }
            });
            break;
        }
        case "status": {
            const profiles = await service.listProfiles();
            const activeProfile = profiles.find((profile) => profile.active);
            write(`Active profile: ${activeProfile ? `${activeProfile.id} (${activeProfile.label})` : "none"}`);
            write(`Available profiles: ${profiles.length}`);
            write(`Runtime isolation active: ${activeProfile ? "yes" : "no"}`);
            write(`Runtime markers: profile=${activeProfile?.id ?? "<none>"}, root=${activeProfile?.dataRoot ?? "<none>"}`);
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
            }
            else {
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
        case "run": {
            const binding = await service.resolveRuntimeBinding();
            if (!binding) {
                write("No active profile. Select or create one first.");
                break;
            }
            const launch = resolveOpencodeLaunch(args);
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
            await new Promise((resolve, reject) => {
                child.once("error", (error) => {
                    if (error.code === "ENOENT") {
                        reject(new Error("OpenCode executable not found in PATH. Install OpenCode and verify it is available in your terminal."));
                        return;
                    }
                    reject(error);
                });
                child.once("exit", (code) => {
                    if (code && code !== 0) {
                        reject(new Error(`OpenCode exited with code ${code}. If OpenCode is not installed, install it and verify 'opencode' is available in PATH.`));
                        return;
                    }
                    resolve();
                });
            });
            break;
        }
        default:
            write("Commands: status | profile | create <id> <label> | list | select <id> | rename <id> <label> | delete <id> | runtime | run [opencode-args] | uninstall-stack [--apply --full --stop-opencode --remove-profiles --clean-npm-cache --verbose-report --plugin-name <name>] (launcher alias: opencode-mpp [opencode-args])");
    }
}
async function main() {
    await runCli(normalizeCliArgv(process.argv.slice(2), process.argv[1]));
}
if (process.env.MPP_SUPPRESS_MAIN !== "1") {
    void main();
}
//# sourceMappingURL=index.js.map