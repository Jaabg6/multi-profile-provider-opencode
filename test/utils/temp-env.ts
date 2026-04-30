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
    await fs.rm(home, { recursive: true, force: true });
  }
}
