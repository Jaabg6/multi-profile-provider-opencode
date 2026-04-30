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
      expect(output[0]).toBe("Active profile: none");
      expect(output[1]).toBe("Available profiles: 0");
      expect(output.join("\n")).toContain("Runtime isolation active:");
      expect(output.join("\n")).toContain("opencode managed path:");
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

  it("shows active runtime binding with isolated OPENCODE_HOME", async () => {
    await withTempProfileHome(async () => {
      const output: string[] = [];
      await runCli(["create", "p1", "Profile One"], (message) => output.push(message));
      output.length = 0;
      await runCli(["runtime"], (message) => output.push(message));
      const binding = JSON.parse(output.at(-1) ?? "{}");
      expect(binding.profileId).toBe("p1");
      expect(binding.env.OPENCODE_HOME).toBe(binding.dataRoot);
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
      expect(spawnCalls[0].cmd).toBe("opencode");
      expect(spawnCalls[0].args).toEqual(["--version"]);
      expect(spawnCalls[0].env.OPENCODE_HOME).toContain("p1");
      expect(spawnCalls[0].env.XDG_DATA_HOME).toContain("p1");
      expect(spawnCalls[0].env.XDG_STATE_HOME).toContain("p1");
      expect(spawnCalls[0].env.XDG_CACHE_HOME).toContain("p1");
      expect(spawnCalls[0].env.XDG_CONFIG_HOME).toContain("p1");
      expect(spawnCalls[0].env.OPENCODE_CONFIG_HOME).toContain("p1");
      expect(spawnCalls[0].env.OPENCODE_PROFILE_ID).toBe("p1");
    });
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

  it("uses original OpenCode launcher when invoked through shim", async () => {
    await withTempProfileHome(async () => {
      await runCli(["create", "p1", "Profile One"]);
      process.env.MPP_ORIGINAL_OPENCODE = "C:\\shim\\opencode.mpp-original.cmd";

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
      expect(spawnCalls[0].cmd).toBe("C:\\shim\\opencode.mpp-original.cmd");
      expect(spawnCalls[0].env.MPP_LAUNCHED_VIA_MPP_RUN).toBe("1");
      delete process.env.MPP_ORIGINAL_OPENCODE;
    });
  });
});
