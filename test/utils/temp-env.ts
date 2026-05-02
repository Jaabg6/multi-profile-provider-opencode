import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempProfileHome(run: (home: string) => Promise<void>): Promise<void> {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "mpp-"));
  const prev = process.env.OPENCODE_PROFILE_HOME;
  process.env.OPENCODE_PROFILE_HOME = home;
  try {
    await run(home);
  } finally {
    if (prev) process.env.OPENCODE_PROFILE_HOME = prev;
    else delete process.env.OPENCODE_PROFILE_HOME;

    let attempts = 0;
    while (attempts < 5) {
      try {
        await fs.rm(home, { recursive: true, force: true });
        break;
      } catch (error) {
        attempts += 1;
        if (attempts >= 5) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 25 * attempts));
      }
    }
  }
}

export async function withIsolatedWindowsEnv(
  run: (ctx: {
    homeDir: string;
    appDataDir: string;
    localAppDataDir: string;
    cwdDir: string;
  }) => Promise<void>
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpp-uninstall-"));
  const homeDir = path.join(root, "home");
  const appDataDir = path.join(root, "appdata");
  const localAppDataDir = path.join(root, "localappdata");
  const cwdDir = path.join(root, "workspace");

  await fs.mkdir(homeDir, { recursive: true });
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.mkdir(localAppDataDir, { recursive: true });
  await fs.mkdir(cwdDir, { recursive: true });

  const prevEnv = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
    LOCALAPPDATA: process.env.LOCALAPPDATA
  };
  const prevCwd = process.cwd();

  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;
  process.env.APPDATA = appDataDir;
  process.env.LOCALAPPDATA = localAppDataDir;

  try {
    process.chdir(cwdDir);
    await run({ homeDir, appDataDir, localAppDataDir, cwdDir });
  } finally {
    process.chdir(prevCwd);

    process.env.HOME = prevEnv.HOME;
    process.env.USERPROFILE = prevEnv.USERPROFILE;
    process.env.APPDATA = prevEnv.APPDATA;
    process.env.LOCALAPPDATA = prevEnv.LOCALAPPDATA;

    await fs.rm(root, { recursive: true, force: true });
  }
}
