import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUninstallPaths } from "../../packages/cli/src/uninstall-stack/paths.ts";

describe("uninstall-stack paths", () => {
  it("uses APPDATA/LOCALAPPDATA precedence on win32", () => {
    const resolved = resolveUninstallPaths({
      platform: "win32",
      cwd: "C:/repo",
      homedir: "C:/Users/dev",
      env: {
        APPDATA: "C:/Users/dev/AppData/Roaming",
        LOCALAPPDATA: "C:/Users/dev/AppData/Local"
      }
    });

    expect(resolved.configRoots).toContain(path.join("C:/Users/dev/AppData/Roaming", "opencode"));
    expect(resolved.stateRoots).toContain(path.join("C:/Users/dev/AppData/Local", "opencode"));
    expect(resolved.cacheRoots).toContain(path.join("C:/Users/dev/AppData/Local", "opencode", "cache"));
  });

  it("falls back to XDG/HOME defaults on linux and darwin", () => {
    const linux = resolveUninstallPaths({
      platform: "linux",
      cwd: "/repo",
      homedir: "/home/dev",
      env: {
        XDG_CONFIG_HOME: "/cfg",
        XDG_STATE_HOME: "/state"
      }
    });

    expect(linux.configRoots).toContain(path.join("/cfg", "opencode"));
    expect(linux.stateRoots).toContain(path.join("/state", "opencode"));
    expect(linux.dataRoots).toContain(path.join("/home/dev", ".local", "share", "opencode"));
    expect(linux.cacheRoots).toContain(path.join("/home/dev", ".cache", "opencode"));

    const darwin = resolveUninstallPaths({
      platform: "darwin",
      cwd: "/repo",
      homedir: "/Users/dev",
      env: {}
    });
    expect(darwin.configRoots).toContain(path.join("/Users/dev", ".config", "opencode"));
  });

  it("fails safely when no home base is available", () => {
    expect(() =>
      resolveUninstallPaths({
        platform: "linux",
        cwd: "/repo",
        homedir: "",
        env: {}
      })
    ).toThrow(/Unable to resolve HOME\/USERPROFILE/);
  });
});
