import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SHIM_MARKER = "### mpp-managed-opencode-shim ###";

export interface ShimInstallResult {
  ok: boolean;
  message: string;
}

type FsLike = Pick<typeof fs, "access" | "copyFile" | "readFile" | "rename" | "writeFile">;

async function fileExists(target: string, fsApi: FsLike): Promise<boolean> {
  try {
    await fsApi.access(target);
    return true;
  } catch {
    return false;
  }
}

function resolveOpencodePathFromEnv(env: NodeJS.ProcessEnv): string {
  const fromEnv = env.OPENCODE_BIN_PATH;
  if (fromEnv && fromEnv.trim().length > 0) return path.resolve(fromEnv);
  if (process.platform === "win32") {
    return path.resolve(path.join(env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "npm", "opencode.cmd"));
  }
  return path.resolve("/usr/local/bin/opencode");
}

function buildWindowsShimScript(): string {
  return [
    "@echo off",
    SHIM_MARKER,
    "setlocal",
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

export async function installOpencodeShim(
  env: NodeJS.ProcessEnv = process.env,
  fsApi: FsLike = fs
): Promise<ShimInstallResult> {
  if (process.platform !== "win32") {
    return {
      ok: false,
      message:
        "Automatic install currently supports Windows cmd shims only. Use 'mpp run ...' directly or install manually on this platform."
    };
  }

  const opencodePath = resolveOpencodePathFromEnv(env);
  const backupPath = path.resolve(path.dirname(opencodePath), "opencode.mpp-original.cmd");

  if (!(await fileExists(opencodePath, fsApi))) {
    return {
      ok: false,
      message: `OpenCode launcher not found at '${opencodePath}'. Set OPENCODE_BIN_PATH to the real opencode.cmd path and retry.`
    };
  }

  const existing = await fsApi.readFile(opencodePath, "utf8");
  if (existing.includes(SHIM_MARKER)) {
    return { ok: true, message: `Shim already installed at '${opencodePath}'.` };
  }

  if (await fileExists(backupPath, fsApi)) {
    return {
      ok: false,
      message:
        `Refusing install: backup already exists at '${backupPath}' while '${opencodePath}' is not managed by mpp. ` +
        "Restore/inspect manually to avoid overwriting an unknown launcher."
    };
  }

  await fsApi.copyFile(opencodePath, backupPath);
  await fsApi.writeFile(opencodePath, buildWindowsShimScript(), "utf8");

  return {
    ok: true,
    message:
      `Installed transparent opencode shim at '${opencodePath}'. Original launcher backed up to '${backupPath}'. ` +
      "Profile selection still requires restarting OpenCode to apply isolated provider auth state."
  };
}

export async function uninstallOpencodeShim(
  env: NodeJS.ProcessEnv = process.env,
  fsApi: FsLike = fs
): Promise<ShimInstallResult> {
  if (process.platform !== "win32") {
    return {
      ok: false,
      message: "Automatic uninstall currently supports Windows cmd shims only."
    };
  }

  const opencodePath = resolveOpencodePathFromEnv(env);
  const backupPath = path.resolve(path.dirname(opencodePath), "opencode.mpp-original.cmd");

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
      message:
        `Refusing uninstall: '${opencodePath}' is not mpp-managed. Move '${backupPath}' back manually if needed.`
    };
  }

  await fsApi.copyFile(backupPath, opencodePath);
  await fsApi.rename(backupPath, `${backupPath}.restored`);

  return {
    ok: true,
    message: `Restored original OpenCode launcher to '${opencodePath}'. Backup moved to '${backupPath}.restored'.`
  };
}
