import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installOpencodeShim, uninstallOpencodeShim } from "../packages/cli/src/shim.ts";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mpp-shim-test-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("opencode shim install/uninstall", () => {
  afterEach(() => {
    delete process.env.OPENCODE_BIN_PATH;
  });

  it("installs shim safely and preserves original launcher", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      await fs.writeFile(opencodePath, "@echo off\r\necho original\r\n", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;

      const result = await installOpencodeShim(process.env);
      expect(result.ok).toBe(true);

      const installed = await fs.readFile(opencodePath, "utf8");
      const backup = await fs.readFile(path.join(dir, "opencode.mpp-original.cmd"), "utf8");
      expect(installed).toContain("mpp-managed-opencode-shim");
      expect(backup).toContain("echo original");
    });
  });

  it("fails loudly when backup exists and launcher is unmanaged", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      await fs.writeFile(opencodePath, "@echo off\r\necho custom\r\n", "utf8");
      await fs.writeFile(path.join(dir, "opencode.mpp-original.cmd"), "backup", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;

      const result = await installOpencodeShim(process.env);
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Refusing install");
    });
  });

  it("restores backup during uninstall", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      await fs.writeFile(opencodePath, "@echo off\r\necho original\r\n", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;
      await installOpencodeShim(process.env);

      const result = await uninstallOpencodeShim(process.env);
      expect(result.ok).toBe(true);

      const restored = await fs.readFile(opencodePath, "utf8");
      expect(restored).toContain("echo original");
      await expect(fs.access(path.join(dir, "opencode.mpp-original.cmd.restored"))).resolves.toBeUndefined();
    });
  });
});
