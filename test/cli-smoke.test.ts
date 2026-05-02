import { describe, expect, it } from "vitest";
import { normalizeCliArgv, runCli } from "../packages/cli/src/index.ts";
import { withTempProfileHome } from "./utils/temp-env.js";

describe("cli smoke", () => {
  it("prints english help output for unknown command", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["unknown"], (message) => output.push(message));
      expect(output.at(-1)).toContain("Commands:");
      expect(output.at(-1)).toContain("uninstall-stack");
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
      expect(output[0]).toBe("Active profile: none");
      expect(output[1]).toBe("Available profiles: 0");
      expect(output.join("\n")).toContain("Runtime isolation active:");
      expect(output.join("\n")).toContain("Runtime markers:");
    });
  });

  it("renders profile management screen with restart-required note", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["create", "p1", "Profile One"]);
      await runCli(["profile"], (message) => output.push(message));

      expect(output.join("\n")).toContain("=== Multi Profile Provider ===");
      expect(output.join("\n")).toContain("Active profile: p1 (Profile One)");
      expect(output.join("\n")).toContain("Restart OpenCode to apply provider auth isolation.");
    });
  });

  it("shows active runtime binding with isolated XDG_DATA_HOME", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["create", "p1", "Profile One"], (message) => output.push(message));
      output.length = 0;
      await runCli(["runtime"], (message) => output.push(message));
      const binding = JSON.parse(output.at(-1) ?? "{}");
      expect(binding.profileId).toBe("p1");
      expect(binding.env.XDG_DATA_HOME).toBe(binding.dataRoot);
    });
  });

  it("runs opencode using active profile runtime env", async () => {
    await withTempProfileHome(async () => {
      await runCli(["create", "p1", "Profile One"]);
      const spawnCalls: Array<{ cmd: string; args: string[]; env: Record<string, string | undefined> }> = [];

      const spawnStub = ((cmd: string, args: string[], options: { env?: Record<string, string | undefined> }) => {
        spawnCalls.push({ cmd, args, env: options.env ?? {} });
        return {
          once: (event: string, handler: (...params: unknown[]) => void) => {
            if (event === "exit") queueMicrotask(() => handler(0));
            return undefined;
          }
        };
      }) as never;

      await runCli(["run", "--version"], () => undefined, spawnStub);

      expect(spawnCalls).toHaveLength(1);
      if (process.platform === "win32") {
        expect(spawnCalls[0].cmd).toBe("cmd.exe");
        expect(spawnCalls[0].args.slice(0, 3)).toEqual(["/d", "/s", "/c"]);
        expect(spawnCalls[0].args[3]).toContain("opencode");
        expect(spawnCalls[0].args[3]).toContain("--version");
      } else {
        expect(spawnCalls[0].cmd).toBe("opencode");
        expect(spawnCalls[0].args).toEqual(["--version"]);
      }
      expect(spawnCalls[0].env.XDG_DATA_HOME).toContain("p1");
      expect(spawnCalls[0].env.OPENCODE_PROFILE_ID).toBe("p1");
    });
  });

  it("maps opencode-mpp invocation to run command", () => {
    expect(normalizeCliArgv(["--version"], "C:/Users/test/AppData/Roaming/npm/opencode-mpp.cmd")).toEqual([
      "run",
      "--version"
    ]);
    expect(normalizeCliArgv([], "/usr/local/bin/opencode-mpp")).toEqual(["run"]);
  });

  it("supports configurable launcher command name via env", () => {
    const previous = process.env.MPP_LAUNCHER_COMMAND;
    try {
      process.env.MPP_LAUNCHER_COMMAND = "my-opencode";
      expect(normalizeCliArgv(["--help"], "/tmp/my-opencode")).toEqual(["run", "--help"]);
    } finally {
      process.env.MPP_LAUNCHER_COMMAND = previous;
    }
  });

  it("fails loudly when opencode executable is unavailable", async () => {
    await withTempProfileHome(async () => {
      await runCli(["create", "p1", "Profile One"]);

      const spawnStub = (() => {
        return {
          once: (event: string, handler: (...params: unknown[]) => void) => {
            if (event === "error") {
              queueMicrotask(() => handler(Object.assign(new Error("missing"), { code: "ENOENT" })));
            }
            return undefined;
          }
        };
      }) as never;

      await expect(runCli(["run"], () => undefined, spawnStub)).rejects.toThrow(
        /OpenCode executable not found in PATH/
      );
    });
  });

});
