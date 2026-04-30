import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

const userVisibleFiles = [
  "README.md",
  "docs/commands.md",
  "docs/security.md",
  "docs/opencode-api-followup.md",
  "docs/opencode-api-validation/docs-research.md",
  "docs/opencode-api-validation/runtime-log.md",
  "packages/core/src/service.ts",
  "packages/core/src/types.ts",
  "packages/opencode-plugin/src/index.ts",
  ".opencode/plugins/validate-opencode-plugin-api.probe.ts",
  ".opencode/commands/profile-status.md",
  ".opencode/commands/profile-list.md",
  ".opencode/commands/profile-create.md",
  ".opencode/commands/profile-select.md",
  ".opencode/commands/profile-delete.md"
];

const likelyNonEnglishTokens = [
  "perfil",
  "reiniciar",
  "seleccionar",
  "eliminar",
  "error de",
  "autenticación",
  "credenciales"
];

describe("english-only user-visible copy", () => {
  it("keeps user-visible content in English", async () => {
    const contents = await Promise.all(userVisibleFiles.map((file) => fs.readFile(file, "utf8")));
    const allText = contents.join("\n").toLowerCase();

    for (const token of likelyNonEnglishTokens) {
      expect(allText).not.toContain(token);
    }

    // Basic guardrail for accented characters commonly found in non-English copy.
    expect(allText).not.toMatch(/[áéíóúñü¿¡]/);
  });
});
