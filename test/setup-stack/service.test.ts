import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createSetupPlan, executeSetupPlan } from "../../packages/cli/src/setup-stack/service.js";
import type { SetupDeps } from "../../packages/cli/src/setup-stack/types.js";
import { runSetupCli } from "../../packages/opencode/src/index.js";
import { withTempProfileHome } from "../utils/temp-env.js";

function createDeps(overrides: Partial<SetupDeps> = {}): SetupDeps {
  const lines: string[] = [];
  const calls: Array<{ command: string; args: string[] }> = [];
  return {
    env: process.env,
    platform: "linux",
    cwd: process.cwd(),
    homedir: process.cwd(),
    write: (line) => lines.push(line),
    spawn: async (command, args) => {
      calls.push({ command, args });
      return { code: 0, stdout: `${command} ok`, stderr: "" };
    },
    ...overrides,
    __test: { lines, calls }
  } as SetupDeps;
}

describe("setup stack orchestration", () => {
  it("creates a plan ordered around OpenCode, CLI bins, plugin, registry, and next commands", async () => {
    const plan = await createSetupPlan({ dryRun: false }, createDeps());

    expect(plan.steps.map((step) => step.name)).toEqual([
      "OpenCode prerequisite",
      "CLI availability",
      "OpenCode plugin",
      "Profile registry",
      "Next commands"
    ]);
  });

  it("stops before plugin installation when OpenCode is missing", async () => {
    const deps = createDeps({
      spawn: async (command, args) => {
        deps.__test.calls.push({ command, args });
        return command === "opencode"
          ? { code: 1, stdout: "", stderr: "not found" }
          : { code: 0, stdout: "ok", stderr: "" };
      }
    });
    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.name === "OpenCode prerequisite")).toMatchObject({ status: "failed" });
    expect(deps.__test.calls).toEqual([{ command: "opencode", args: ["--version"] }]);
    expect(deps.__test.lines.join("\n")).toContain("Install OpenCode");
  });

  it("uses npm.cmd on Windows for CLI install fallback and verifies both launchers", async () => {
    const deps = createDeps({
      platform: "win32",
      spawn: async (command, args) => {
        deps.__test.calls.push({ command, args });
        if (command === "mpp" || command === "opencode-mpp") return { code: 1, stdout: "", stderr: "missing" };
        return { code: 0, stdout: "ok", stderr: "" };
      }
    });

    await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

    expect(deps.__test.calls).toContainEqual({
      command: "npm.cmd",
      args: ["install", "-g", "@multi-profile-provider/cli@latest"]
    });
    expect(deps.__test.calls).toEqual(
      expect.arrayContaining([
        { command: "mpp", args: ["--version"] },
        { command: "opencode-mpp", args: ["--version"] }
      ])
    );
  });

  it("does not treat npx temporary dependency bins as persistent CLI availability", async () => {
    const npxBin = path.join("C:", "Users", "Jabibi", "AppData", "Local", "npm-cache", "_npx", "abc123", "node_modules", ".bin");
    const globalBin = path.join("C:", "Users", "Jabibi", "AppData", "Roaming", "npm");
    const seenPaths: string[] = [];
    const deps = createDeps({
      platform: "win32",
      env: { ...process.env, Path: [npxBin, globalBin].join(path.delimiter) },
      spawn: async (command, args, options) => {
        deps.__test.calls.push({ command, args });
        if (command === "mpp" || command === "opencode-mpp") {
          seenPaths.push(options?.env?.Path ?? "");
          return { code: 1, stdout: "", stderr: `${command} missing outside npx` };
        }
        return { code: 0, stdout: "ok", stderr: "" };
      }
    });

    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.name === "CLI availability")).toMatchObject({ status: "failed" });
    expect(deps.__test.calls).toContainEqual({ command: "npm.cmd", args: ["install", "-g", "@multi-profile-provider/cli@latest"] });
    expect(seenPaths).not.toHaveLength(0);
    for (const seenPath of seenPaths) {
      expect(seenPath).not.toContain("_npx");
      expect(seenPath).toContain(globalBin);
    }
    expect(deps.__test.lines.join("\n")).not.toContain("mpp and opencode-mpp are already available");
  });

  it("does not treat workspace or package node_modules bins as persistent CLI availability", async () => {
    const workspaceBin = path.join("D:", "ProgramacionTera", "multi-profile-provider-opencode", "node_modules", ".bin");
    const packageDependencyBin = path.join(
      "C:",
      "Users",
      "Jabibi",
      "AppData",
      "Local",
      "npm-cache",
      "_npx",
      "abc123",
      "node_modules",
      "@multi-profile-provider",
      "opencode",
      "node_modules",
      ".bin"
    );
    const persistentBin = path.join("C:", "Users", "Jabibi", "AppData", "Roaming", "npm");
    const seenPaths: string[] = [];
    const deps = createDeps({
      platform: "win32",
      env: { ...process.env, Path: [workspaceBin, packageDependencyBin, persistentBin].join(path.delimiter) },
      spawn: async (command, args, options) => {
        deps.__test.calls.push({ command, args });
        if (command === "mpp" || command === "opencode-mpp") {
          seenPaths.push(options?.env?.Path ?? "");
          return { code: 1, stdout: "", stderr: `${command} missing outside local package bins` };
        }
        return { code: 0, stdout: "ok", stderr: "" };
      }
    });

    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

    expect(result.ok).toBe(false);
    expect(deps.__test.calls).toContainEqual({ command: "npm.cmd", args: ["install", "-g", "@multi-profile-provider/cli@latest"] });
    for (const seenPath of seenPaths) {
      expect(seenPath).not.toContain("node_modules\\.bin");
      expect(seenPath).toContain(persistentBin);
    }
    expect(deps.__test.lines.join("\n")).not.toContain("mpp and opencode-mpp are already available");
  });

  it("verifies Windows global npm shims after install and warns when prefix is not on PATH", async () => {
    const prefix = path.join("C:", "Users", "Jabibi", "AppData", "Roaming", "npm");
    let installed = false;
    const deps = createDeps({
      platform: "win32",
      env: { ...process.env, Path: "C:\\Windows\\System32", PATH: "C:\\Windows\\System32" },
      pathExists: async (targetPath) =>
        installed && (targetPath === path.join(prefix, "mpp.cmd") || targetPath === path.join(prefix, "opencode-mpp.cmd")),
      spawn: async (command, args) => {
        deps.__test.calls.push({ command, args });
        if (command === "npm.cmd" && args.join(" ") === "config get prefix") return { code: 0, stdout: `${prefix}\n`, stderr: "" };
        if (command === "npm.cmd" && args.join(" ") === "install -g @multi-profile-provider/cli@latest") installed = true;
        if (command === "mpp" || command === "opencode-mpp") return { code: 1, stdout: "", stderr: "missing" };
        return { code: 0, stdout: "ok", stderr: "" };
      }
    });

    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);
    const cliStep = result.steps.find((step) => step.name === "CLI availability");

    expect(result.ok).toBe(true);
    expect(deps.__test.calls).toContainEqual({ command: "npm.cmd", args: ["install", "-g", "@multi-profile-provider/cli@latest"] });
    expect(cliStep).toMatchObject({
      status: "done",
      message: "Installed mpp and opencode-mpp, but they are not invocable until the npm global prefix is on PATH."
    });
    expect(cliStep?.detail).toContain(prefix);
    expect(deps.__test.lines.join("\n")).not.toContain("Installed and verified mpp and opencode-mpp");
  });

  it("reports npm global install failure without claiming CLI launchers are ready", async () => {
    const deps = createDeps({
      spawn: async (command, args) => {
        deps.__test.calls.push({ command, args });
        if (command === "opencode") return { code: 0, stdout: "opencode ok", stderr: "" };
        if (command === "npm") {
          return {
            code: 243,
            stdout: "",
            stderr: "npm ERR! install failed password=hunter2 token=abc123"
          };
        }
        return { code: 1, stdout: "", stderr: `${command} missing` };
      }
    });

    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);
    const output = deps.__test.lines.join("\n");

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.name === "CLI availability")).toMatchObject({ status: "failed" });
    expect(output).toContain("npm install -g @multi-profile-provider/cli@latest exited 243");
    expect(output).toContain("password=<redacted>");
    expect(output).toContain("token=<redacted>");
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("Installed and verified mpp and opencode-mpp");
    expect(output).not.toContain("OpenCode plugin is installed or refreshed");
    expect(deps.__test.calls).not.toContainEqual({
      command: "opencode",
      args: ["plugin", "-g", "multi-profile-provider-opencode-plugin@latest"]
    });
  });

  it("reports plugin install failure with sanitized command and output context", async () => {
    const deps = createDeps({
      spawn: async (command, args) => {
        deps.__test.calls.push({ command, args });
        if (command === "opencode" && args[0] === "plugin") {
          return {
            code: 7,
            stdout: "retry with api_key=live-key",
            stderr: "plugin failed Authorization: Bearer secret-token password=opensesame"
          };
        }
        return { code: 0, stdout: `${command} ok`, stderr: "" };
      }
    });

    const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);
    const output = deps.__test.lines.join("\n");

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.name === "OpenCode plugin")).toMatchObject({ status: "failed" });
    expect(output).toContain("opencode plugin -g multi-profile-provider-opencode-plugin@latest exited 7");
    expect(output).toContain("api_key=<redacted>");
    expect(output).toContain("Authorization: Bearer <redacted>");
    expect(output).toContain("password=<redacted>");
    expect(output).not.toContain("live-key");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("opensesame");
    expect(output).not.toContain("[done] Profile registry");
  });

  it("creates main/Main only for an empty valid registry and generates no secrets", async () => {
    await withTempProfileHome(async (home) => {
      const deps = createDeps({ env: { ...process.env, OPENCODE_PROFILE_HOME: home }, homedir: home });

      const result = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

      const registry = JSON.parse(await fs.readFile(path.join(home, "registry.json"), "utf8"));
      expect(result.ok).toBe(true);
      expect(registry.activeProfileId).toBe("main");
      expect(registry.profiles).toHaveLength(1);
      expect(registry.profiles[0]).toMatchObject({ id: "main", label: "Main", status: "active" });
      expect(JSON.stringify(registry).toLowerCase()).not.toContain("api");
      expect(JSON.stringify(registry).toLowerCase()).not.toContain("secret");
      expect(JSON.stringify(registry).toLowerCase()).not.toContain("key");
    });
  });

  it("preserves existing profiles and leaves malformed registries unchanged", async () => {
    await withTempProfileHome(async (home) => {
      const registryPath = path.join(home, "registry.json");
      const existing = {
        version: 1,
        activeProfileId: "alpha",
        profiles: [
          {
            id: "alpha",
            label: "Alpha",
            status: "active",
            dataRoot: path.join(home, "alpha"),
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      };
      await fs.writeFile(registryPath, JSON.stringify(existing, null, 2), "utf8");
      const deps = createDeps({ env: { ...process.env, OPENCODE_PROFILE_HOME: home }, homedir: home });

      await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

      expect(JSON.parse(await fs.readFile(registryPath, "utf8"))).toEqual(existing);

      await fs.writeFile(registryPath, "{ malformed", "utf8");
      const blocked = await executeSetupPlan(await createSetupPlan({ dryRun: false }, deps), deps);

      expect(blocked.ok).toBe(false);
      expect(await fs.readFile(registryPath, "utf8")).toBe("{ malformed");
      expect(blocked.steps.find((step) => step.name === "Profile registry")).toMatchObject({ status: "failed" });
    });
  });

  it("wires the installer setup command to the planner/executor output", async () => {
    await withTempProfileHome(async (home) => {
      const output: string[] = [];

      const code = await runSetupCli(["setup"], {
        write: (line) => output.push(line),
        createSetupDeps: () =>
          createDeps({
            env: { ...process.env, OPENCODE_PROFILE_HOME: home },
            homedir: home,
            write: (line) => output.push(line)
          })
      });

      expect(code).toBe(0);
      expect(output.join("\n")).toContain("[done] Profile registry: created main/Main");
      expect(output.join("\n")).toContain("opencode-mpp");
      expect(output.join("\n")).toContain("mpp run");
    });
  });
});
