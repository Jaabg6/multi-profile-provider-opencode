import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  prepareOpenCodeAuthForProfile,
  resolveDefaultOpenCodeAuthPath,
  resolveProfileOpenCodeAuthPath
} from "../packages/core/src/opencode-auth-swap.js";
import { withIsolatedWindowsEnv } from "./utils/temp-env.js";

describe("OpenCode auth swap", () => {
  it("saves current global auth to previous profile and copies next profile auth to global", async () => {
    await withIsolatedWindowsEnv(async ({ homeDir }) => {
      const env = { USERPROFILE: homeDir, HOME: homeDir };
      const previousProfile = { id: "main", label: "Main", active: true, dataRoot: path.join(homeDir, "profiles", "main", "data") };
      const nextProfile = { id: "work", label: "Work", active: false, dataRoot: path.join(homeDir, "profiles", "work", "data") };
      const globalAuth = resolveDefaultOpenCodeAuthPath(env);
      const previousAuth = resolveProfileOpenCodeAuthPath(previousProfile);
      const nextAuth = resolveProfileOpenCodeAuthPath(nextProfile);

      await fs.mkdir(path.dirname(globalAuth), { recursive: true });
      await fs.writeFile(globalAuth, JSON.stringify({ openai: { key: "current" } }));
      await fs.mkdir(path.dirname(nextAuth), { recursive: true });
      await fs.writeFile(nextAuth, JSON.stringify({ anthropic: { key: "next" } }));

      const result = await prepareOpenCodeAuthForProfile({ previousProfile, nextProfile, env, now: new Date("2026-05-11T00:00:00Z") });

      await expect(fs.readFile(previousAuth, "utf8")).resolves.toBe(JSON.stringify({ openai: { key: "current" } }));
      await expect(fs.readFile(globalAuth, "utf8")).resolves.toBe(JSON.stringify({ anthropic: { key: "next" } }));
      expect(result.action).toBe("copied-profile-auth");
      expect(result.backupAuthPath).toContain("backup-mpp-20260511T000000Z");
    });
  });

  it("clears global auth for a profile with no auth yet after backing up current auth", async () => {
    await withIsolatedWindowsEnv(async ({ homeDir }) => {
      const env = { USERPROFILE: homeDir, HOME: homeDir };
      const previousProfile = { id: "main", label: "Main", active: true, dataRoot: path.join(homeDir, "profiles", "main", "data") };
      const nextProfile = { id: "fresh", label: "Fresh", active: false, dataRoot: path.join(homeDir, "profiles", "fresh", "data") };
      const globalAuth = resolveDefaultOpenCodeAuthPath(env);

      await fs.mkdir(path.dirname(globalAuth), { recursive: true });
      await fs.writeFile(globalAuth, JSON.stringify({ openai: { key: "current" } }));

      const result = await prepareOpenCodeAuthForProfile({ previousProfile, nextProfile, env });

      await expect(fs.stat(globalAuth)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(fs.readFile(resolveProfileOpenCodeAuthPath(previousProfile), "utf8")).resolves.toBe(JSON.stringify({ openai: { key: "current" } }));
      expect(result.action).toBe("cleared-global-auth");
      expect(result.backupAuthPath).toBeDefined();
    });
  });
});
