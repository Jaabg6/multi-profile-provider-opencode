import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/index.ts";
import { withTempProfileHome } from "./utils/temp-env.js";

describe("cli smoke", () => {
  it("prints english help output for unknown command", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["unknown"], (message) => output.push(message));
      expect(output.at(-1)).toContain("Commands:");
    });
  });

  it("prints english success message for create command", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["create", "p1", "Profile One"], (message) => output.push(message));
      expect(output.at(-1)).toBe("Profile created.");
    });
  });

  it("prints english status output for fallback usage", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["status"], (message) => output.push(message));
      expect(output).toEqual(["Active profile: none", "Available profiles: 0"]);
    });
  });
});
