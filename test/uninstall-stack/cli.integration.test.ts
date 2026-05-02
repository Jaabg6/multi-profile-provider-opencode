import { describe, expect, it } from "vitest";
import { runCli } from "../../packages/cli/src/index.ts";

describe("uninstall-stack cli integration", () => {
  it("prints plan output by default", async () => {
    const output: string[] = [];
    await runCli(["uninstall-stack"], (line) => output.push(line));
    expect(output.join("\n")).toContain("[PLAN]");
  });

  it("prints verbose report details with --verbose-report", async () => {
    const output: string[] = [];
    await runCli(["uninstall-stack", "--verbose-report"], (line) => output.push(line));
    const text = output.join("\n");
    expect(text).toContain("Resolved paths");
    expect(text).toContain("Selected targets");
  });
});
