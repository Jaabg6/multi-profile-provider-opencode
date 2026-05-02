import fs from "node:fs/promises";
import path from "node:path";
import { parseUninstallStackArgs } from "./args.js";
import { createBackup, readJsonFile, writeJsonFile } from "./json.js";
import { isCanonicalMppPlugin } from "./matching.js";
import { resolveUninstallPaths } from "./paths.js";
async function removePathIfExists(targetPath) {
    const exists = await fs.stat(targetPath).then(() => true).catch(() => false);
    if (!exists)
        return false;
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
}
async function stopOpencodeProcessesBestEffort(plan, deps) {
    if (!(plan.args.apply && plan.args.stopOpencode))
        return;
    deps.write("Stop OpenCode requested.");
    if (deps.platform === "win32") {
        const imageNames = ["opencode.exe", "open-code.exe", "opencode-mpp.exe"];
        for (const imageName of imageNames) {
            await deps.spawn("taskkill", ["/IM", imageName, "/F"]);
        }
        return;
    }
    await deps.spawn("pkill", ["-TERM", "-f", "opencode"]);
    await deps.spawn("pkill", ["-KILL", "-f", "opencode"]);
}
async function removeProfilesIfRequested(plan, deps) {
    if (!(plan.args.apply && plan.args.removeProfiles))
        return false;
    deps.write("Remove profiles requested.");
    let removedAny = false;
    for (const profileRoot of plan.paths.profileRoots) {
        const removed = await removePathIfExists(profileRoot);
        removedAny = removedAny || removed;
    }
    return removedAny;
}
function filterPluginList(value, pluginNames) {
    if (!Array.isArray(value))
        return value;
    return value.filter((entry) => typeof entry !== "string" || !isCanonicalMppPlugin(entry, pluginNames));
}
async function mutateJsonPlugins(filePath, args, deps) {
    const json = await readJsonFile(filePath);
    if (!json || typeof json !== "object")
        return false;
    const record = json;
    let changed = false;
    if (Array.isArray(record.plugin)) {
        const next = filterPluginList(record.plugin, args.pluginNames);
        if (JSON.stringify(next) !== JSON.stringify(record.plugin)) {
            record.plugin = next;
            changed = true;
        }
    }
    if (Array.isArray(record.plugins)) {
        const next = filterPluginList(record.plugins, args.pluginNames);
        if (JSON.stringify(next) !== JSON.stringify(record.plugins)) {
            record.plugins = next;
            changed = true;
        }
    }
    if (!changed)
        return false;
    if (args.mode === "plan")
        return true;
    await createBackup(filePath, deps.now?.() ?? new Date(), deps.env.MPP_UNINSTALL_FORCE_BACKUP_FAILURE === "1");
    await writeJsonFile(filePath, record);
    return true;
}
export async function createUninstallPlan(argsInput, deps) {
    const args = parseUninstallStackArgs([]);
    const merged = { ...args, ...argsInput };
    if (merged.full) {
        merged.apply = true;
        merged.mode = "apply";
        merged.stopOpencode = true;
        merged.removeProfiles = true;
        merged.cleanNpmCache = true;
        merged.verboseReport = true;
    }
    if (merged.apply)
        merged.mode = "apply";
    return {
        args: merged,
        paths: resolveUninstallPaths({
            env: deps.env,
            platform: deps.platform,
            cwd: deps.cwd,
            homedir: deps.homedir
        })
    };
}
export async function executeUninstallPlan(plan, deps) {
    const candidates = [
        path.join(deps.cwd, ".opencode", "opencode.json"),
        path.join(plan.paths.configRoots[1] ?? "", "tui.json"),
        path.join(plan.paths.stateRoots[0] ?? "", "plugin-meta.json"),
        path.join(plan.paths.stateRoots[0] ?? "", "kv.json")
    ];
    deps.write("[PLAN] uninstall-stack");
    for (const item of candidates)
        deps.write(`[PLAN] inspect ${item}`);
    if (plan.args.verboseReport) {
        deps.write(`Resolved paths: ${JSON.stringify(plan.paths)}`);
        deps.write(`Selected targets: ${JSON.stringify(candidates)}`);
    }
    await stopOpencodeProcessesBestEffort(plan, deps);
    let changedAny = false;
    for (const filePath of candidates) {
        const exists = await fs.stat(filePath).then(() => true).catch(() => false);
        if (!exists)
            continue;
        const changed = await mutateJsonPlugins(filePath, plan.args, deps);
        changedAny = changedAny || changed;
    }
    if (plan.args.cleanNpmCache && plan.args.mode === "apply") {
        await deps.spawn(deps.platform === "win32" ? "npm.cmd" : "npm", ["cache", "clean", "--force"]);
    }
    const removedProfiles = await removeProfilesIfRequested(plan, deps);
    if (plan.args.apply) {
        await deps.spawn(deps.platform === "win32" ? "npm.cmd" : "npm", ["uninstall", "-g", "@multi-profile-provider/cli"]);
    }
    if (!changedAny && !removedProfiles && plan.args.mode === "apply") {
        deps.write("No canonical MPP targets found.");
    }
}
//# sourceMappingURL=service.js.map