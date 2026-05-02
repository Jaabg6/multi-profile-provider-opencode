import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { UninstallDeps } from "../../../packages/cli/src/uninstall-stack/types.ts";

export async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpp-uninstall-test-"));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value), "utf8");
}

export function createLinuxDeps(root: string, env: NodeJS.ProcessEnv = {}): UninstallDeps {
  return {
    env: { HOME: root, ...env },
    platform: "linux",
    cwd: root,
    homedir: root,
    spawn: async () => ({ code: 0, stdout: "", stderr: "" }),
    write: () => undefined,
    now: () => new Date("2026-01-01T00:00:00.000Z")
  };
}
