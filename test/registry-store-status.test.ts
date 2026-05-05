import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RegistryStore } from "@multi-profile-provider/core";
import { withTempProfileHome } from "./utils/temp-env.js";

describe("registry strict status", () => {
  it("distinguishes missing, empty, and valid registries with non-deleted profiles", async () => {
    await withTempProfileHome(async (home) => {
      const registryPath = path.join(home, "registry.json");
      const store = new RegistryStore(registryPath);

      await expect(store.readStatus()).resolves.toMatchObject({ state: "missing", profiles: [] });

      await fs.writeFile(registryPath, JSON.stringify({ version: 1, profiles: [] }), "utf8");
      await expect(store.readStatus()).resolves.toMatchObject({ state: "empty", profiles: [] });

      await fs.writeFile(
        registryPath,
        JSON.stringify({
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
        }),
        "utf8"
      );

      await expect(store.readStatus()).resolves.toMatchObject({ state: "valid-with-profiles" });
    });
  });

  it("does not treat malformed registry content as empty while read() stays forgiving", async () => {
    await withTempProfileHome(async (home) => {
      const registryPath = path.join(home, "registry.json");
      const store = new RegistryStore(registryPath);
      await fs.writeFile(registryPath, "{ broken json", "utf8");

      await expect(store.readStatus()).resolves.toMatchObject({ state: "malformed" });
      await expect(store.read()).resolves.toEqual({ version: 1, profiles: [] });
      await expect(fs.readFile(registryPath, "utf8")).resolves.toBe("{ broken json");
    });
  });

  it("reports unreadable registry paths separately from missing and malformed files", async () => {
    await withTempProfileHome(async (home) => {
      const registryPath = path.join(home, "registry-as-directory");
      await fs.mkdir(registryPath);

      await expect(new RegistryStore(registryPath).readStatus()).resolves.toMatchObject({ state: "unreadable" });
    });
  });
});
