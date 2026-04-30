import os from "node:os";
import path from "node:path";
import { assertPathUnderBase } from "./validation.js";

export function resolveBaseRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.OPENCODE_PROFILE_HOME;
  return path.resolve(configured ?? path.join(os.homedir(), ".opencode-profiles"));
}

export function resolveProfileDataRoot(profileId: string, env: NodeJS.ProcessEnv = process.env): string {
  const base = resolveBaseRoot(env);
  const root = path.resolve(base, profileId, "data");
  assertPathUnderBase(base, root);
  return root;
}

export function resolveRegistryPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(resolveBaseRoot(env), "registry.json");
}
