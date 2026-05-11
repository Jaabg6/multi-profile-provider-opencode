import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await fs.readFile(path, "utf8")) as T;
}

describe("plugin-only package and documentation UX", () => {
  it("demotes legacy CLI package metadata and root scripts from daily workflow", async () => {
    const rootPackage = await readJson<{ scripts: Record<string, string> }>("package.json");
    const cliPackage = await readJson<{ description: string; bin?: Record<string, string> }>("packages/cli/package.json");

    expect(Object.keys(rootPackage.scripts)).not.toEqual(expect.arrayContaining(["mpp", "mpp:status", "mpp:profile"]));
    expect(rootPackage.scripts["release:pack:dry-run"]).toContain("@multi-profile-provider/cli");
    expect(cliPackage.description).toContain("internal lifecycle helpers");
    expect(cliPackage.bin).toEqual({ mpp: 'dist/index.js', 'opencode-mpp': 'dist/opencode-mpp.js' });
  });

  it("points user docs to OpenCode plugin tools and legacy cleanup instead of mpp run", async () => {
    const readme = await fs.readFile("README.md", "utf8");

    expect(readme).toContain("opencode plugin -g multi-profile-provider-opencode-plugin");
    expect(readme).toContain("OpenCode plugin tools");
    expect(readme).toContain("Legacy cleanup");
    expect(readme).toContain("npx @multi-profile-provider/opencode uninstall --preserve-profiles");
    expect(readme).toContain("npx @multi-profile-provider/opencode uninstall --purge-profiles");
    expect(readme).toContain("mpp run");
    expect(readme).toContain("opencode-mpp");
  });

  it("keeps current security docs aligned with plugin-owned provider auth", async () => {
    const security = await fs.readFile("docs/security.md", "utf8");

    expect(security).toContain("plugin-owned provider auth");
    expect(security).toContain("subsequent provider requests");
    expect(security).toContain("OpenCode plugin path");
    expect(security).toContain("preserve or purge profile data");
    expect(security).not.toContain("Runtime isolation is applied by binding");
    expect(security).not.toContain("on relaunch");
    expect(security).not.toContain("daily launcher");
    expect(security).not.toContain("primary runtime path");
  });
});
