import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

const requiredCommandFiles = [
  ".opencode/commands/profile.md",
  ".opencode/commands/profile-status.md",
  ".opencode/commands/profile-list.md",
  ".opencode/commands/profile-create.md",
  ".opencode/commands/profile-select.md",
  ".opencode/commands/profile-delete.md"
];

function extractDescription(content: string): string {
  const match = content.match(/^---\s*[\r\n]+description:\s*(.+)\s*[\r\n]+---/m);
  return match?.[1]?.trim() ?? "";
}

describe("OpenCode commands catalog", () => {
  it("includes the required profile commands with English descriptions", async () => {
    for (const file of requiredCommandFiles) {
      const content = await fs.readFile(file, "utf8");
      const description = extractDescription(content);
      expect(description.length).toBeGreaterThan(0);
      expect(description).toMatch(/[a-z]/i);
      expect(description).not.toMatch(/[áéíóúñü¿¡]/);
    }
  });
});
