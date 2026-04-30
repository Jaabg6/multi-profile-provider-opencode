#!/usr/bin/env node
import { spawn } from "node:child_process";
import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";
import { installOpencodeShim, uninstallOpencodeShim } from "./shim.js";
export async function runCli(argv, write = console.log, spawnProcess = spawn) {
    const [cmd, ...args] = argv;
    const service = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
    switch (cmd) {
        case "status": {
            const profiles = await service.listProfiles();
            const activeProfile = profiles.find((profile) => profile.active);
            write(`Active profile: ${activeProfile ? `${activeProfile.id} (${activeProfile.label})` : "none"}`);
            write(`Available profiles: ${profiles.length}`);
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
            const opencodeCommand = "opencode";
            const child = spawnProcess(opencodeCommand, args, {
                stdio: "inherit",
                shell: process.platform === "win32",
                env: {
                    ...process.env,
                    ...binding.env
                }
            });
            await new Promise((resolve, reject) => {
                child.once("error", (error) => {
                    if (error.code === "ENOENT") {
                        reject(new Error(`OpenCode executable not found in PATH (${opencodeCommand}). Install OpenCode and verify it is available in your terminal.`));
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
            write("Commands: status | profile | create <id> <label> | list | select <id> | rename <id> <label> | delete <id> | runtime | run [opencode-args] | install | uninstall");
    }
}
async function main() {
    await runCli(process.argv.slice(2));
}
void main();
//# sourceMappingURL=index.js.map