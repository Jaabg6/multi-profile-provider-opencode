import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { withIsolatedWindowsEnv } from "./utils/temp-env.js";

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts", "uninstall-mpp-stack.ps1");

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
}

async function runUninstall(args: string[] = []): Promise<{ code: number; output: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", SCRIPT_PATH, ...args],
      { env: process.env }
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, output }));
  });
}

describe("uninstall-mpp-stack.ps1", { timeout: 30000 }, () => {
  it("removes only canonical MPP entries and preserves unrelated plugin records", async () => {
    await withIsolatedWindowsEnv(async ({ homeDir, appDataDir, localAppDataDir, cwdDir }) => {
      const opencodePath = path.join(cwdDir, ".opencode", "opencode.json");
      const tuiPath = path.join(homeDir, ".config", "opencode", "tui.json");
      const pluginMetaPath = path.join(appDataDir, "opencode", "plugin-meta.json");
      const kvPath = path.join(localAppDataDir, "opencode", "kv.json");

      await writeJson(opencodePath, {
        plugin: ["multi-profile-provider-opencode-plugin", "opencode-subagent-statusline"],
        plugins: ["@multi-profile-provider/opencode-plugin", "list"]
      });
      await writeJson(tuiPath, {
        plugin: ["multi-profile-provider-opencode-plugin", "opencode-subagent-statusline"]
      });
      await writeJson(pluginMetaPath, {
        "multi-profile-provider-opencode-plugin": { enabled: true },
        "opencode-subagent-statusline": { enabled: true },
        list: { enabled: true }
      });
      await writeJson(kvPath, {
        plugin_enabled: {
          "multi-profile-provider-opencode-plugin": true,
          "opencode-subagent-statusline": true,
          list: true
        },
        list: "keep"
      });

      const result = await runUninstall(["-Apply"]);
      expect(result.code).toBe(0);

      const opencode = await readJson<{ plugin: string[]; plugins: string[] }>(opencodePath);
      const tui = await readJson<{ plugin: string[] }>(tuiPath);
      const pluginMeta = await readJson<Record<string, unknown>>(pluginMetaPath);
      const kv = await readJson<{ plugin_enabled: Record<string, boolean>; list: string }>(kvPath);

      expect(opencode.plugin).toEqual(["opencode-subagent-statusline"]);
      expect(opencode.plugins).toEqual(["list"]);
      expect(tui.plugin).toEqual(["opencode-subagent-statusline"]);
      expect(pluginMeta).toHaveProperty("opencode-subagent-statusline");
      expect(pluginMeta).toHaveProperty("list");
      expect(pluginMeta).not.toHaveProperty("multi-profile-provider-opencode-plugin");
      expect(kv.plugin_enabled).toEqual({
        "opencode-subagent-statusline": true,
        list: true
      });
      expect(kv.list).toBe("keep");
    });
  });

  it("removes normalized versioned and scoped variants", async () => {
    await withIsolatedWindowsEnv(async ({ homeDir, cwdDir }) => {
      const opencodePath = path.join(cwdDir, ".opencode", "opencode.json");
      const tuiPath = path.join(homeDir, ".config", "opencode", "tui.json");
      await writeJson(opencodePath, {
        plugin: [
          "multi-profile-provider-opencode-plugin@1.2.3",
          "@multi-profile-provider/opencode-plugin@next",
          "opencode-subagent-statusline"
        ]
      });
      await writeJson(tuiPath, {
        plugin: ["npm:@multi-profile-provider/opencode-plugin@1.0.0", "list"]
      });

      const result = await runUninstall(["-Apply"]);
      expect(result.code).toBe(0);

      const opencode = await readJson<{ plugin: string[] }>(opencodePath);
      const tui = await readJson<{ plugin: string[] }>(tuiPath);
      expect(opencode.plugin).toEqual(["opencode-subagent-statusline"]);
      expect(tui.plugin).toEqual(["list"]);
    });
  });

  it("dry-run reports plan but keeps files byte-identical and creates no backups", async () => {
    await withIsolatedWindowsEnv(async ({ cwdDir }) => {
      const opencodePath = path.join(cwdDir, ".opencode", "opencode.json");
      await writeJson(opencodePath, {
        plugin: ["multi-profile-provider-opencode-plugin", "opencode-subagent-statusline"]
      });
      const before = await fs.readFile(opencodePath, "utf8");

      const result = await runUninstall([]);
      expect(result.code).toBe(0);
      expect(result.output).toContain("[PLAN]");

      const after = await fs.readFile(opencodePath, "utf8");
      expect(after).toBe(before);

      const folderEntries = await fs.readdir(path.dirname(opencodePath));
      const backupFiles = folderEntries.filter((entry) => entry.includes("backup-"));
      expect(backupFiles).toHaveLength(0);
    });
  });

  it("creates backups before mutating json files", async () => {
    await withIsolatedWindowsEnv(async ({ cwdDir, homeDir, appDataDir, localAppDataDir }) => {
      const opencodePath = path.join(cwdDir, ".opencode", "opencode.json");
      const tuiPath = path.join(homeDir, ".config", "opencode", "tui.json");
      const pluginMetaPath = path.join(appDataDir, "opencode", "plugin-meta.json");
      const kvPath = path.join(localAppDataDir, "opencode", "kv.json");

      await writeJson(opencodePath, { plugin: ["multi-profile-provider-opencode-plugin"] });
      await writeJson(tuiPath, { plugin: ["multi-profile-provider-opencode-plugin"] });
      await writeJson(pluginMetaPath, { "multi-profile-provider-opencode-plugin": true });
      await writeJson(kvPath, { plugin_enabled: { "multi-profile-provider-opencode-plugin": true } });

      const result = await runUninstall(["-Apply"]);
      expect(result.code).toBe(0);

      for (const filePath of [opencodePath, tuiPath, pluginMetaPath, kvPath]) {
        const entries = await fs.readdir(path.dirname(filePath));
        expect(entries.some((entry) => entry.startsWith(`${path.basename(filePath)}.backup-`))).toBe(true);
      }
    });
  });

  it("aborts safely without mutations when backup creation fails", async () => {
    await withIsolatedWindowsEnv(async ({ cwdDir }) => {
      const opencodePath = path.join(cwdDir, ".opencode", "opencode.json");
      await writeJson(opencodePath, {
        plugin: ["multi-profile-provider-opencode-plugin", "opencode-subagent-statusline"]
      });

      const before = await fs.readFile(opencodePath, "utf8");
      const previousFlag = process.env.MPP_UNINSTALL_FORCE_BACKUP_FAILURE;
      process.env.MPP_UNINSTALL_FORCE_BACKUP_FAILURE = "1";

      try {
        const result = await runUninstall(["-Apply"]);
        expect(result.code).not.toBe(0);
        expect(result.output).toContain("Abortando mutaci");
      } finally {
        if (previousFlag === undefined) {
          delete process.env.MPP_UNINSTALL_FORCE_BACKUP_FAILURE;
        } else {
          process.env.MPP_UNINSTALL_FORCE_BACKUP_FAILURE = previousFlag;
        }
      }

      const after = await fs.readFile(opencodePath, "utf8");
      expect(after).toBe(before);

      const entries = await fs.readdir(path.dirname(opencodePath));
      const backupFiles = entries.filter((entry) => entry.includes("backup-"));
      expect(backupFiles).toHaveLength(0);
    });
  });

  it("removes only MPP cache paths and preserves unrelated cache data", async () => {
    await withIsolatedWindowsEnv(async ({ homeDir, appDataDir }) => {
      const mppCacheDir = path.join(homeDir, ".cache", "opencode", "multi-profile-provider-opencode-plugin@1.0.0");
      const unrelatedCacheDir = path.join(homeDir, ".cache", "opencode", "opencode-subagent-statusline");
      const appDataMppDir = path.join(appDataDir, "opencode", "@multi-profile-provider", "opencode-plugin");
      const appDataUnrelatedDir = path.join(appDataDir, "opencode", "plugins", "list");

      await fs.mkdir(mppCacheDir, { recursive: true });
      await fs.mkdir(unrelatedCacheDir, { recursive: true });
      await fs.mkdir(appDataMppDir, { recursive: true });
      await fs.mkdir(appDataUnrelatedDir, { recursive: true });
      await fs.writeFile(path.join(unrelatedCacheDir, "keep.txt"), "keep", "utf8");
      await fs.writeFile(path.join(appDataUnrelatedDir, "keep.txt"), "keep", "utf8");

      const result = await runUninstall(["-Apply"]);
      expect(result.code).toBe(0);

      await expect(fs.stat(mppCacheDir)).rejects.toThrow();
      await expect(fs.stat(appDataMppDir)).rejects.toThrow();
      await expect(fs.stat(unrelatedCacheDir)).resolves.toBeDefined();
      await expect(fs.stat(appDataUnrelatedDir)).resolves.toBeDefined();
    });
  });
});
