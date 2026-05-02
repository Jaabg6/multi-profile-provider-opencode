import { describe, expect, it } from "vitest";
import { parseUninstallStackArgs } from "../../packages/cli/src/uninstall-stack/args.ts";

describe("uninstall-stack args", () => {
  it("defaults to dry-run plan mode", () => {
    const parsed = parseUninstallStackArgs([]);
    expect(parsed.mode).toBe("plan");
    expect(parsed.apply).toBe(false);
  });

  it("supports apply and explicit flags", () => {
    const parsed = parseUninstallStackArgs([
      "--apply",
      "--stop-opencode",
      "--remove-profiles",
      "--clean-npm-cache",
      "--verbose-report",
      "--plugin-name",
      "custom-plugin"
    ]);

    expect(parsed.apply).toBe(true);
    expect(parsed.mode).toBe("apply");
    expect(parsed.stopOpencode).toBe(true);
    expect(parsed.removeProfiles).toBe(true);
    expect(parsed.cleanNpmCache).toBe(true);
    expect(parsed.verboseReport).toBe(true);
    expect(parsed.pluginNames).toContain("custom-plugin");
  });

  it("expands --full to all destructive flags", () => {
    const parsed = parseUninstallStackArgs(["--full"]);
    expect(parsed.apply).toBe(true);
    expect(parsed.mode).toBe("apply");
    expect(parsed.stopOpencode).toBe(true);
    expect(parsed.removeProfiles).toBe(true);
    expect(parsed.cleanNpmCache).toBe(true);
    expect(parsed.verboseReport).toBe(true);
  });

  it("accepts dry-run aliases and keeps plan mode", () => {
    for (const flag of ["--dry-run", "--plan"]) {
      const parsed = parseUninstallStackArgs([flag]);
      expect(parsed.mode).toBe("plan");
      expect(parsed.apply).toBe(false);
    }
  });
});
