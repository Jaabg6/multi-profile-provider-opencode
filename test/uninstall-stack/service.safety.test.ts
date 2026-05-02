import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createUninstallPlan, executeUninstallPlan } from "../../packages/cli/src/uninstall-stack/service.ts";
import { createLinuxDeps, withTempDir, writeJson } from "./fixtures/helpers.ts";

describe("uninstall-stack safety", () => {
  it("does not mutate on dry-run", async () => {
    await withTempDir(async (root) => {
      const opencode = path.join(root, ".opencode", "opencode.json");
      await writeJson(opencode, { plugin: ["multi-profile-provider-opencode-plugin", "list"] });
      const before = await fs.readFile(opencode, "utf8");

      const deps = createLinuxDeps(root);

      const plan = await createUninstallPlan({ mode: "plan", apply: false, pluginNames: [] }, deps);
      await executeUninstallPlan(plan, deps);

      const after = await fs.readFile(opencode, "utf8");
      expect(after).toBe(before);
    });
  });

  it("removes canonical mpp plugin entries but preserves unrelated plugins", async () => {
    await withTempDir(async (root) => {
      const opencode = path.join(root, ".opencode", "opencode.json");
      await writeJson(opencode, { plugin: ["multi-profile-provider-opencode-plugin", "opencode-subagent-statusline"] });

      const deps = createLinuxDeps(root);

      const plan = await createUninstallPlan({ mode: "apply", apply: true, pluginNames: [] }, deps);
      await executeUninstallPlan(plan, deps);

      const parsed = JSON.parse(await fs.readFile(opencode, "utf8")) as { plugin: string[] };
      expect(parsed.plugin).toEqual(["opencode-subagent-statusline"]);
    });
  });

  it("aborts apply if backup creation fails", async () => {
    await withTempDir(async (root) => {
      const opencode = path.join(root, ".opencode", "opencode.json");
      await writeJson(opencode, { plugin: ["multi-profile-provider-opencode-plugin"] });

      const deps = createLinuxDeps(root, { MPP_UNINSTALL_FORCE_BACKUP_FAILURE: "1" });

      const plan = await createUninstallPlan({ mode: "apply", apply: true, pluginNames: [] }, deps);
      await expect(executeUninstallPlan(plan, deps)).rejects.toThrow(/backup/i);
    });
  });
});
