import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function read(path: string): Promise<string> {
  return fs.readFile(path, "utf8");
}

describe("one-command OpenCode setup documentation", () => {
  it("positions the product package README as the recommended setup entrypoint", async () => {
    const readme = await read("packages/opencode/README.md");

    expect(readme).toContain("npx @multi-profile-provider/opencode setup");
    expect(readme).toContain("What setup does");
    expect(readme).toContain("Safe to run again");
    expect(readme).toContain("default `Main` profile");
    expect(readme).toContain("Troubleshooting");
    expect(readme).toContain("Lower-level packages");
    expect(readme).toContain("opencode-mpp");
    expect(readme).toContain("mpp run");
    expect(readme).not.toContain("mpp setup-stack");
  });

  it("points root and command docs to the one-command setup flow", async () => {
    const rootReadme = await read("README.md");
    const commands = await read("docs/commands.md");

    for (const doc of [rootReadme, commands]) {
      expect(doc).toContain("npx @multi-profile-provider/opencode setup");
      expect(doc).toContain("opencode-mpp");
      expect(doc).toContain("mpp run");
      expect(doc).not.toContain("mpp setup-stack");
    }
  });

  it("labels older package READMEs as lower-level or direct-install paths", async () => {
    const packageDocs = await Promise.all([
      read("packages/cli/README.md"),
      read("packages/core/README.md"),
      read("packages/opencode-plugin/README.md"),
      read("packages/opencode-plugin-public/README.md")
    ]);

    for (const doc of packageDocs) {
      expect(doc).toContain("npx @multi-profile-provider/opencode setup");
      expect(doc.toLowerCase()).toMatch(/lower-level|direct-install|compatibility/);
      expect(doc).not.toContain("mpp setup-stack");
    }
  });
});
