import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectShimDiagnostics, installOpencodeShim, uninstallOpencodeShim } from "../packages/cli/src/shim.ts";

const ORIGINAL_PATH = process.env.PATH;

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
    process.env.PATH = ORIGINAL_PATH;
  });

  it("installs shim safely and preserves original launcher", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      const companionPath = path.join(dir, "opencode");
      await fs.writeFile(opencodePath, "@echo off\r\necho original\r\n", "utf8");
      await fs.writeFile(companionPath, "@echo off\r\necho companion\r\n", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;
      process.env.PATH = `${dir};${process.env.PATH ?? ""}`;

      const result = await installOpencodeShim(process.env);
      expect(result.ok).toBe(true);

      const installed = await fs.readFile(opencodePath, "utf8");
      const backup = await fs.readFile(path.join(dir, "opencode.mpp-original.cmd"), "utf8");
      const companionInstalled = await fs.readFile(companionPath, "utf8");
      const companionBackup = await fs.readFile(path.join(dir, "opencode.mpp-original"), "utf8");
      expect(installed).toContain("mpp-managed-opencode-shim");
      expect(installed).toContain("set MPP_SHIM_ACTIVE=1");
      expect(installed).toContain("set MPP_ORIGINAL_OPENCODE=%~dp0opencode.mpp-original.cmd");
      expect(companionInstalled).toContain("call \"%~dp0opencode.cmd\" %*");
      expect(backup).toContain("echo original");
      expect(companionBackup).toContain("echo companion");

      const diagnostics = await collectShimDiagnostics(process.env);
      expect(diagnostics.companionBypassPath?.toLowerCase()).toContain("opencode");
    });
  });

  it("fails loudly when backup exists and launcher is unmanaged", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      await fs.writeFile(opencodePath, "@echo off\r\necho custom\r\n", "utf8");
      await fs.writeFile(path.join(dir, "opencode.mpp-original.cmd"), "backup", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;
      process.env.PATH = `${dir};${process.env.PATH ?? ""}`;

      const result = await installOpencodeShim(process.env);
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Refusing install");
    });
  });

  it("restores backup during uninstall", async () => {
    await withTempDir(async (dir) => {
      const opencodePath = path.join(dir, "opencode.cmd");
      const companionPath = path.join(dir, "opencode");
      await fs.writeFile(opencodePath, "@echo off\r\necho original\r\n", "utf8");
      await fs.writeFile(companionPath, "@echo off\r\necho companion\r\n", "utf8");
      process.env.OPENCODE_BIN_PATH = opencodePath;
      process.env.PATH = `${dir};${process.env.PATH ?? ""}`;
      await installOpencodeShim(process.env);

      const result = await uninstallOpencodeShim(process.env);
      expect(result.ok).toBe(true);

      const restored = await fs.readFile(opencodePath, "utf8");
      expect(restored).toContain("echo original");
      await expect(fs.access(path.join(dir, "opencode.mpp-original.cmd.restored"))).resolves.toBeUndefined();
      await expect(fs.access(path.join(dir, "opencode.mpp-original.restored"))).resolves.toBeUndefined();
    });
  });
});
