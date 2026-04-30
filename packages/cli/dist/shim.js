import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
const SHIM_MARKER = "### mpp-managed-opencode-shim ###";
async function fileExists(target, fsApi) {
    try {
        await fsApi.access(target);
        return true;
    }
    catch {
        return false;
    }
}
function resolveOpencodePathFromEnv(env) {
    const fromEnv = env.OPENCODE_BIN_PATH;
    if (fromEnv && fromEnv.trim().length > 0)
        return path.resolve(fromEnv);
    if (process.platform === "win32") {
        return path.resolve(path.join(env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "npm", "opencode.cmd"));
    }
    return path.resolve("/usr/local/bin/opencode");
}
function buildWindowsShimScript() {
    return [
        "@echo off",
        `REM ${SHIM_MARKER}`,
        "setlocal",
        "set MPP_SHIM_ACTIVE=1",
        "set MPP_ORIGINAL_OPENCODE=%~dp0opencode.mpp-original.cmd",
        "if not exist \"%MPP_ORIGINAL_OPENCODE%\" (",
        "  echo [mpp] Missing original OpenCode backup at %MPP_ORIGINAL_OPENCODE%",
        "  exit /b 2",
        ")",
        "where mpp >nul 2>nul",
        "if %errorlevel%==0 (",
        "  mpp run %*",
        "  exit /b %errorlevel%",
        ")",
        "if exist \"%~dp0mpp.cmd\" (",
        "  call \"%~dp0mpp.cmd\" run %*",
        "  exit /b %errorlevel%",
        ")",
        "echo [mpp] mpp command not found. Falling back to original OpenCode binary.",
        "call \"%MPP_ORIGINAL_OPENCODE%\" %*",
        "exit /b %errorlevel%"
    ].join("\r\n");
}
function buildWindowsCompanionScript() {
    return [
        "@echo off",
        `REM ${SHIM_MARKER}`,
        "setlocal",
        "if exist \"%~dp0opencode.cmd\" (",
        "  call \"%~dp0opencode.cmd\" %*",
        "  exit /b %errorlevel%",
        ")",
        "echo [mpp] Missing opencode.cmd companion shim near %~f0",
        "exit /b 2"
    ].join("\r\n");
}
function resolveOpencodeFromPath(env) {
    const candidates = resolveOpencodeCandidatesFromPath("opencode", env);
    return candidates[0] ?? null;
}
function resolveOpencodeCandidatesFromPath(command, env) {
    if (process.platform === "win32") {
        const output = spawnSync("where.exe", [command], {
            shell: false,
            encoding: "utf8",
            env
        });
        if (output.status !== 0)
            return [];
        return output.stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => path.resolve(line));
    }
    return [];
}
function resolveCompanionBypassPath(configuredOpencodePath, resolvedCandidates) {
    const configuredDir = path.dirname(configuredOpencodePath);
    const configuredLower = path.resolve(configuredOpencodePath).toLowerCase();
    for (const candidate of resolvedCandidates) {
        const resolved = path.resolve(candidate);
        const parsed = path.parse(resolved);
        if (resolved.toLowerCase() === configuredLower)
            continue;
        if (parsed.name.toLowerCase() !== "opencode" || parsed.ext.length > 0)
            continue;
        if (path.dirname(resolved).toLowerCase() !== configuredDir.toLowerCase())
            continue;
        return resolved;
    }
    return null;
}
async function installManagedFile(targetPath, backupPath, content, fsApi) {
    if (!(await fileExists(targetPath, fsApi))) {
        return { ok: false, message: `Launcher not found at '${targetPath}'.` };
    }
    const existing = await fsApi.readFile(targetPath, "utf8");
    if (existing.includes(SHIM_MARKER)) {
        const legacyBrokenMarker = /(?:^|\r?\n)### mpp-managed-opencode-shim ###(?:\r?\n|$)/.test(existing);
        if (legacyBrokenMarker) {
            await fsApi.writeFile(targetPath, content, "utf8");
            return { ok: true, changed: true };
        }
        return { ok: true, changed: false };
    }
    if (await fileExists(backupPath, fsApi)) {
        return {
            ok: false,
            message: `Refusing install: backup already exists at '${backupPath}' while '${targetPath}' is not managed by mpp. ` +
                "Restore/inspect manually to avoid overwriting an unknown launcher."
        };
    }
    await fsApi.copyFile(targetPath, backupPath);
    await fsApi.writeFile(targetPath, content, "utf8");
    return { ok: true, changed: true };
}
export async function collectShimDiagnostics(env = process.env, fsApi = fs) {
    const configuredOpencodePath = resolveOpencodePathFromEnv(env);
    const resolvedOpencodeCandidates = resolveOpencodeCandidatesFromPath("opencode", env);
    const resolvedOpencodeCmdCandidates = resolveOpencodeCandidatesFromPath("opencode.cmd", env);
    const resolvedOpencodePath = resolvedOpencodeCandidates[0] ?? null;
    const resolvedOpencodeCmdPath = resolvedOpencodeCmdCandidates[0] ?? null;
    const backupPath = path.resolve(path.dirname(configuredOpencodePath), "opencode.mpp-original.cmd");
    const companionBypassPath = resolveCompanionBypassPath(configuredOpencodePath, resolvedOpencodeCandidates);
    const companionBackupPath = companionBypassPath
        ? path.resolve(path.dirname(companionBypassPath), "opencode.mpp-original")
        : null;
    const configuredContent = (await fileExists(configuredOpencodePath, fsApi))
        ? await fsApi.readFile(configuredOpencodePath, "utf8")
        : "";
    const companionContent = companionBypassPath && (await fileExists(companionBypassPath, fsApi))
        ? await fsApi.readFile(companionBypassPath, "utf8")
        : "";
    const managedLower = configuredOpencodePath.toLowerCase();
    const resolvedLower = resolvedOpencodePath?.toLowerCase();
    const interceptionByManaged = Boolean(resolvedLower && resolvedLower === managedLower && configuredContent.includes(SHIM_MARKER));
    const interceptionByCompanion = Boolean(companionBypassPath &&
        resolvedLower &&
        resolvedLower === companionBypassPath.toLowerCase() &&
        companionContent.includes(SHIM_MARKER));
    let launcherInterceptionOk = false;
    let launcherInterceptionReason = "opencode not found in PATH.";
    if (interceptionByManaged || interceptionByCompanion) {
        launcherInterceptionOk = true;
        launcherInterceptionReason = "mpp-managed launcher is first in PATH resolution.";
    }
    else if (resolvedOpencodePath) {
        launcherInterceptionReason =
            `PATH resolves '${resolvedOpencodePath}' first, which is not an mpp-managed launcher. ` +
                "Run 'mpp install' to repair interception or move managed launcher ahead in PATH.";
    }
    return {
        resolvedOpencodePath,
        resolvedOpencodeCmdPath,
        resolvedOpencodeCandidates,
        configuredOpencodePath,
        shimInstalledAtConfiguredPath: configuredContent.includes(SHIM_MARKER),
        backupExistsAtConfiguredPath: await fileExists(backupPath, fsApi),
        companionBypassPath,
        companionShimInstalled: companionContent.includes(SHIM_MARKER),
        companionBackupPath,
        companionBackupExists: companionBackupPath ? await fileExists(companionBackupPath, fsApi) : false,
        launcherInterceptionOk,
        launcherInterceptionReason,
        activeProfileIsolation: {
            enabled: Boolean(env.OPENCODE_PROFILE_ID && env.OPENCODE_PROFILE_DATA_ROOT),
            profileId: env.OPENCODE_PROFILE_ID,
            dataRoot: env.OPENCODE_PROFILE_DATA_ROOT
        }
    };
}
export async function installOpencodeShim(env = process.env, fsApi = fs) {
    if (process.platform !== "win32") {
        return {
            ok: false,
            message: "Automatic install currently supports Windows cmd shims only. Use 'mpp run ...' directly or install manually on this platform."
        };
    }
    const opencodePath = resolveOpencodePathFromEnv(env);
    const backupPath = path.resolve(path.dirname(opencodePath), "opencode.mpp-original.cmd");
    const resolvedCandidates = resolveOpencodeCandidatesFromPath("opencode", env);
    const companionBypassPath = resolveCompanionBypassPath(opencodePath, resolvedCandidates);
    const companionBackupPath = companionBypassPath
        ? path.resolve(path.dirname(companionBypassPath), "opencode.mpp-original")
        : null;
    const cmdInstall = await installManagedFile(opencodePath, backupPath, buildWindowsShimScript(), fsApi);
    if (!cmdInstall.ok)
        return { ok: false, message: cmdInstall.message };
    if (companionBypassPath && companionBackupPath) {
        const companionInstall = await installManagedFile(companionBypassPath, companionBackupPath, buildWindowsCompanionScript(), fsApi);
        if (!companionInstall.ok)
            return { ok: false, message: companionInstall.message };
    }
    const diagnostics = await collectShimDiagnostics(env, fsApi);
    if (!diagnostics.launcherInterceptionOk) {
        return {
            ok: false,
            message: `${diagnostics.launcherInterceptionReason} Managed path: '${diagnostics.configuredOpencodePath}'. ` +
                "If another launcher still wins PATH precedence, move the managed npm bin directory before it or remove the conflicting launcher."
        };
    }
    return {
        ok: true,
        message: `Installed transparent opencode shim at '${opencodePath}'. Original launcher backed up to '${backupPath}'. ` +
            (companionBypassPath ? `Companion launcher protected at '${companionBypassPath}'. ` : "") +
            "Profile selection still requires restarting OpenCode to apply isolated provider auth state."
    };
}
export async function uninstallOpencodeShim(env = process.env, fsApi = fs) {
    if (process.platform !== "win32") {
        return {
            ok: false,
            message: "Automatic uninstall currently supports Windows cmd shims only."
        };
    }
    const opencodePath = resolveOpencodePathFromEnv(env);
    const backupPath = path.resolve(path.dirname(opencodePath), "opencode.mpp-original.cmd");
    const companionPath = path.resolve(path.dirname(opencodePath), "opencode");
    const companionBackupPath = path.resolve(path.dirname(opencodePath), "opencode.mpp-original");
    if (!(await fileExists(backupPath, fsApi))) {
        return {
            ok: false,
            message: `Backup not found at '${backupPath}'. Nothing to restore safely.`
        };
    }
    const current = (await fileExists(opencodePath, fsApi)) ? await fsApi.readFile(opencodePath, "utf8") : "";
    if (current.length > 0 && !current.includes(SHIM_MARKER)) {
        return {
            ok: false,
            message: `Refusing uninstall: '${opencodePath}' is not mpp-managed. Move '${backupPath}' back manually if needed.`
        };
    }
    await fsApi.copyFile(backupPath, opencodePath);
    await fsApi.rename(backupPath, `${backupPath}.restored`);
    if (await fileExists(companionBackupPath, fsApi)) {
        const currentCompanion = (await fileExists(companionPath, fsApi)) ? await fsApi.readFile(companionPath, "utf8") : "";
        if (currentCompanion.length > 0 && !currentCompanion.includes(SHIM_MARKER)) {
            return {
                ok: false,
                message: `Refusing uninstall: '${companionPath}' is not mpp-managed while '${companionBackupPath}' exists. ` +
                    "Restore companion launcher manually to avoid overwriting unknown changes."
            };
        }
        await fsApi.copyFile(companionBackupPath, companionPath);
        await fsApi.rename(companionBackupPath, `${companionBackupPath}.restored`);
    }
    return {
        ok: true,
        message: `Restored original OpenCode launcher to '${opencodePath}'. Backup moved to '${backupPath}.restored'.`
    };
}
//# sourceMappingURL=shim.js.map