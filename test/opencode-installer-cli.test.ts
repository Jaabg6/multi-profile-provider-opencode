import { describe, expect, it } from "vitest";
import { runSetupCli, setupSpawnOptions } from "../packages/opencode/src/index.ts";
import { withTempProfileHome } from "./utils/temp-env.js";

describe("opencode installer CLI", () => {
  it("uses the Windows shell for setup subprocesses so npm .cmd shims can run", () => {
    expect(setupSpawnOptions("win32")).toMatchObject({ shell: true });
    expect(setupSpawnOptions("linux")).toMatchObject({ shell: false });
    expect(setupSpawnOptions("darwin")).toMatchObject({ shell: false });
  });

  it("prints product help when no supported subcommand is provided", async () => {
    const output: string[] = [];

    const code = await runSetupCli([], { write: (message) => output.push(message) });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Multi Profile Provider for OpenCode");
    expect(output.join("\n")).toContain("npx @multi-profile-provider/opencode setup");
  });

  it("returns a usage error for unsupported subcommands", async () => {
    const output: string[] = [];

    const code = await runSetupCli(["install"], { write: (message) => output.push(message) });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Unsupported command: install");
    expect(output.join("\n")).toContain("Supported command: setup");
  });

  it("dispatches setup to the injected setup runner and reports planned checks", async () => {
    const output: string[] = [];
    const calls: string[][] = [];

    const code = await runSetupCli(["setup", "--dry-run"], {
      write: (message) => output.push(message),
      runSetup: async (args) => {
        calls.push(args);
        return { code: 0, lines: ["Planned setup checks: OpenCode, CLI, plugin, registry, next commands"] };
      }
    });

    expect(code).toBe(0);
    expect(calls).toEqual([["--dry-run"]]);
    expect(output.join("\n")).toContain("Multi Profile Provider for OpenCode setup");
    expect(output.join("\n")).toContain("Planned setup checks: OpenCode, CLI, plugin, registry, next commands");
  });

  it("uses injected setup dependencies for the default planner/executor", async () => {
    await withTempProfileHome(async (home) => {
      const output: string[] = [];

      const code = await runSetupCli(["setup"], {
        write: (message) => output.push(message),
        createSetupDeps: (write) => ({
          env: { ...process.env, OPENCODE_PROFILE_HOME: home },
          platform: "linux",
          cwd: process.cwd(),
          homedir: home,
          write,
          spawn: async (command, args) => ({ code: 0, stdout: `${command} ${args.join(" ")} ok`, stderr: "" })
        })
      });

      expect(code).toBe(0);
      expect(output.join("\n")).toContain("[plan] Setup checks: OpenCode, CLI, plugin, registry, next commands");
      expect(output.join("\n")).toContain("[done] Next commands: Launch OpenCode with opencode-mpp");
    });
  });
});
