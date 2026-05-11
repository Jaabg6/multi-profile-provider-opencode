import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ProfileView } from "./types.js";

export type PrepareOpenCodeAuthResult = {
  globalAuthPath: string;
  previousProfileAuthPath?: string;
  nextProfileAuthPath: string;
  backupAuthPath?: string;
  action: "copied-profile-auth" | "cleared-global-auth";
};

function homeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.USERPROFILE ?? env.HOME ?? os.homedir();
}

export function resolveDefaultOpenCodeAuthPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(homeDir(env), ".local", "share", "opencode", "auth.json");
}

export function resolveProfileOpenCodeAuthPath(profile: Pick<ProfileView, "dataRoot">): string {
  return path.join(profile.dataRoot, "opencode", "auth.json");
}

function backupSuffix(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function copyIfExists(source: string, target: string): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function prepareOpenCodeAuthForProfile(input: {
  previousProfile?: ProfileView;
  nextProfile: ProfileView;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}): Promise<PrepareOpenCodeAuthResult> {
  const globalAuthPath = resolveDefaultOpenCodeAuthPath(input.env);
  const nextProfileAuthPath = resolveProfileOpenCodeAuthPath(input.nextProfile);
  const result: PrepareOpenCodeAuthResult = {
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
