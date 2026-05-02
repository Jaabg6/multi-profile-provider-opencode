import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createUninstallPlan, executeUninstallPlan } from "../../packages/cli/src/uninstall-stack/service.ts";
import type { UninstallDeps } from "../../packages/cli/src/uninstall-stack/types.ts";
import { withTempDir, writeJson } from "./fixtures/helpers.ts";

type SpawnCall = { command: string; args: string[] };

function createDeps(root: string, platform: NodeJS.Platform = "linux", env: NodeJS.ProcessEnv = {}) {
  const spawnCalls: SpawnCall[] = [];
  const output: string[] = [];
  const deps: UninstallDeps = {
    env: { HOME: root, ...env },
    platform,
    cwd: root,
    homedir: root,
    spawn: async (command, args) => {
      spawnCalls.push({ command, args });
      return { code: 0, stdout: "", stderr: "" };
    },
    write: (line) => output.push(line),
    now: () => new Date("2026-01-01T00:00:00.000Z")
  };
  return { deps, spawnCalls, output };
}

describe("uninstall-stack action execution", () => {
  it("does not execute stop-opencode or remove-profiles in plan mode", async () => {
    await withTempDir(async (root) => {
      const profileRoot = path.join(root, "profiles");
      await fs.mkdir(profileRoot, { recursive: true });
      await fs.writeFile(path.join(profileRoot, "keep.txt"), "safe", "utf8");

      const { deps, spawnCalls } = createDeps(root, "linux", { OPENCODE_PROFILE_HOME: profileRoot });
      const plan = await createUninstallPlan({ mode: "plan", apply: false, stopOpencode: true, removeProfiles: true }, deps);
      await executeUninstallPlan(plan, deps);

      expect(spawnCalls).toEqual([]);
      const stillExists = await fs.stat(profileRoot).then(() => true).catch(() => false);
      expect(stillExists).toBe(true);
    });
  });

  it("executes best-effort stop-opencode on unix when apply is true", async () => {
    await withTempDir(async (root) => {
      const { deps, spawnCalls } = createDeps(root, "linux");
      const plan = await createUninstallPlan({ mode: "apply", apply: true, stopOpencode: true }, deps);
      await executeUninstallPlan(plan, deps);

      expect(spawnCalls).toContainEqual({ command: "pkill", args: ["-TERM", "-f", "opencode"] });
      expect(spawnCalls).toContainEqual({ command: "pkill", args: ["-KILL", "-f", "opencode"] });
      expect(spawnCalls).toContainEqual({ command: "npm", args: ["uninstall", "-g", "@multi-profile-provider/cli"] });
    });
  });

  it("executes best-effort stop-opencode on windows when apply is true", async () => {
    await withTempDir(async (root) => {
      const { deps, spawnCalls } = createDeps(root, "win32", {
        APPDATA: path.join(root, "appdata"),
        LOCALAPPDATA: path.join(root, "localappdata")
      });
      const plan = await createUninstallPlan({ mode: "apply", apply: true, stopOpencode: true }, deps);
      await executeUninstallPlan(plan, deps);

      expect(spawnCalls).toContainEqual({ command: "taskkill", args: ["/IM", "opencode.exe", "/F"] });
      expect(spawnCalls).toContainEqual({ command: "taskkill", args: ["/IM", "open-code.exe", "/F"] });
      expect(spawnCalls).toContainEqual({ command: "npm.cmd", args: ["uninstall", "-g", "@multi-profile-provider/cli"] });
    });
  });

  it("removes profile roots only when remove-profiles is enabled in apply mode", async () => {
    await withTempDir(async (root) => {
      const profileRoot = path.join(root, "profiles");
      await fs.mkdir(profileRoot, { recursive: true });
      await fs.writeFile(path.join(profileRoot, "profile.json"), "{}", "utf8");

      const first = createDeps(root, "linux", { OPENCODE_PROFILE_HOME: profileRoot });
      const planNoRemove = await createUninstallPlan({ mode: "apply", apply: true, removeProfiles: false }, first.deps);
      await executeUninstallPlan(planNoRemove, first.deps);
      const existsAfterNoRemove = await fs.stat(profileRoot).then(() => true).catch(() => false);
      expect(existsAfterNoRemove).toBe(true);

      const second = createDeps(root, "linux", { OPENCODE_PROFILE_HOME: profileRoot });
      const planRemove = await createUninstallPlan({ mode: "apply", apply: true, removeProfiles: true }, second.deps);
      await executeUninstallPlan(planRemove, second.deps);
      const existsAfterRemove = await fs.stat(profileRoot).then(() => true).catch(() => false);
      expect(existsAfterRemove).toBe(false);
    });
  });

  it("expands --full behavior to apply stop remove profiles clean cache and verbose output", async () => {
    await withTempDir(async (root) => {
      const profileRoot = path.join(root, "profiles");
      await fs.mkdir(profileRoot, { recursive: true });
      await fs.writeFile(path.join(profileRoot, "profile.json"), "{}", "utf8");

      const opencode = path.join(root, ".opencode", "opencode.json");
      await writeJson(opencode, { plugin: ["multi-profile-provider-opencode-plugin"] });

      const { deps, spawnCalls, output } = createDeps(root, "linux", { OPENCODE_PROFILE_HOME: profileRoot });
      const plan = await createUninstallPlan({ full: true }, deps);
      await executeUninstallPlan(plan, deps);

      expect(spawnCalls).toContainEqual({ command: "pkill", args: ["-TERM", "-f", "opencode"] });
      expect(spawnCalls).toContainEqual({ command: "npm", args: ["cache", "clean", "--force"] });
      expect(spawnCalls).toContainEqual({ command: "npm", args: ["uninstall", "-g", "@multi-profile-provider/cli"] });

      const outputText = output.join("\n");
      expect(outputText).toContain("Resolved paths");
      expect(outputText).toContain("Selected targets");
      expect(outputText).toContain("Stop OpenCode requested");
      expect(outputText).toContain("Remove profiles requested");

      const profileExists = await fs.stat(profileRoot).then(() => true).catch(() => false);
      expect(profileExists).toBe(false);
    });
  });
});
