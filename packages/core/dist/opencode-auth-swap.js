import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
function homeDir(env = process.env) {
    return env.USERPROFILE ?? env.HOME ?? os.homedir();
}
export function resolveDefaultOpenCodeAuthPath(env = process.env) {
    return path.join(homeDir(env), ".local", "share", "opencode", "auth.json");
}
export function resolveProfileOpenCodeAuthPath(profile) {
    return path.join(profile.dataRoot, "opencode", "auth.json");
}
function backupSuffix(now = new Date()) {
    return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
async function copyIfExists(source, target) {
    try {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
        return true;
    }
    catch (error) {
        if (error.code === "ENOENT")
            return false;
        throw error;
    }
}
export async function prepareOpenCodeAuthForProfile(input) {
    const globalAuthPath = resolveDefaultOpenCodeAuthPath(input.env);
    const nextProfileAuthPath = resolveProfileOpenCodeAuthPath(input.nextProfile);
    const result = {
        globalAuthPath,
        nextProfileAuthPath,
        action: "cleared-global-auth"
    };
    const globalExists = await fs.stat(globalAuthPath).then(() => true).catch(() => false);
    if (globalExists) {
        result.backupAuthPath = `${globalAuthPath}.backup-mpp-${backupSuffix(input.now)}`;
        await copyIfExists(globalAuthPath, result.backupAuthPath);
        if (input.previousProfile) {
            result.previousProfileAuthPath = resolveProfileOpenCodeAuthPath(input.previousProfile);
            await copyIfExists(globalAuthPath, result.previousProfileAuthPath);
        }
    }
    const copiedNext = await copyIfExists(nextProfileAuthPath, globalAuthPath);
    if (copiedNext) {
        result.action = "copied-profile-auth";
        return result;
    }
    await fs.rm(globalAuthPath, { force: true });
    result.action = "cleared-global-auth";
    return result;
}
