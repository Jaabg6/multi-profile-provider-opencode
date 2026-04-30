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
