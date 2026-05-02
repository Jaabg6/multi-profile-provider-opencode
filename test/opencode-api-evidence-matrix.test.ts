import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

const BANNED_LEGACY_API_TOKENS = ["registerCommand", "notify", "canRestart", "restart"];

const PRODUCTION_ADAPTER_ARTIFACTS = [
  "packages/opencode-plugin/src/index.ts",
  "packages/opencode-plugin/dist/index.js",
  "packages/opencode-plugin/dist/index.d.ts"
];

describe("opencode api evidence matrix", () => {
  it("contains required schema fields for each row", async () => {
    const raw = await fs.readFile("docs/opencode-api-validation/evidence-matrix.json", "utf8");
    const matrix = JSON.parse(raw) as { rows: Array<Record<string, unknown>> };

    expect(Array.isArray(matrix.rows)).toBe(true);
    expect(matrix.rows.length).toBeGreaterThan(0);

    const required = [
      "capability_id",
      "claim",
      "source_type",
      "source_ref",
      "opencode_version",
      "doc_version_or_date",
      "probe_id",
      "outcome",
      "confidence",
      "notes",
      "reviewer",
      "timestamp"
    ];

    for (const row of matrix.rows) {
      for (const key of required) {
        expect(row[key]).toBeDefined();
      }
    }
  });

  it("tracks unsupported adapter assumptions and tool-first contract evidence", async () => {
    const raw = await fs.readFile("docs/opencode-api-validation/evidence-matrix.json", "utf8");
    const matrix = JSON.parse(raw) as {
      rows: Array<{ capability_id: string; outcome: string; notes: string; claim: string }>;
    };

    const byId = new Map(matrix.rows.map((row) => [row.capability_id, row]));

    expect(byId.get("adapter-assumption-registerCommand")?.outcome).toBe("UNSUPPORTED");
    expect(byId.get("adapter-assumption-notify")?.outcome).toBe("UNSUPPORTED");
    expect(byId.get("adapter-assumption-restart")?.outcome).toBe("UNSUPPORTED");
    expect(byId.get("plugin-custom-tools")?.outcome).toBe("SUPPORTED");
    expect(byId.get("plugin-cli-install")?.claim).toContain("opencode plugin <module>");
  });

  it("keeps publish-intended adapter artifacts free of banned legacy API contracts", async () => {
    const scannedEntries = await Promise.all(
      PRODUCTION_ADAPTER_ARTIFACTS.map(async (artifactPath) => {
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          return { artifactPath, content };
        } catch {
          return null;
        }
      })
    );

    const presentEntries = scannedEntries.filter((entry): entry is { artifactPath: string; content: string } => entry !== null);

    expect(presentEntries.length).toBeGreaterThan(0);

    for (const token of BANNED_LEGACY_API_TOKENS) {
      for (const entry of presentEntries) {
        expect(entry.content, `${entry.artifactPath} contains banned token ${token}`).not.toContain(token);
      }
    }

    const declarationEntry = presentEntries.find((entry) => entry.artifactPath.endsWith("index.d.ts"))?.content;
    expect(declarationEntry).toBeDefined();

    expect(declarationEntry).toContain("MultiProfileProviderPlugin");
    expect(declarationEntry).toContain("Plugin");
  });
});
