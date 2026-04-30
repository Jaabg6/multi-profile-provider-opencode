import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  NoopRestartController,
  ProfileService,
  RegistryStore,
  RESTART_REQUIRED_MESSAGE,
  resolveProfileDataRoot,
  resolveRegistryPath
} from "@multi-profile-provider/core";
import { withTempProfileHome } from "./utils/temp-env.js";

describe("profile service", () => {
  it("creates and lists profiles with one active", async () => {
    await withTempProfileHome(async () => {
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
      await svc.createProfile({ id: "gpt1", label: "GPT One" });
      await svc.createProfile({ id: "gpt2", label: "GPT Two" });
      const list = await svc.listProfiles();
      expect(list).toHaveLength(2);
      expect(list.filter((p) => p.active)).toHaveLength(1);
    });
  });

  it("rejects invalid profile names", async () => {
    await withTempProfileHome(async () => {
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
      await expect(svc.createProfile({ id: "../bad", label: "Bad" })).rejects.toThrow("Invalid profile id.");
      await expect(svc.createProfile({ id: "bad:name", label: "Bad Two" })).rejects.toThrow("Invalid profile id.");
      await expect(svc.createProfile({ id: "good-id", label: "Bad*Label" })).rejects.toThrow("Invalid profile label.");
    });
  });

  it("selects profile and returns fallback restart message", async () => {
    await withTempProfileHome(async () => {
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
      await svc.createProfile({ id: "a", label: "Alpha" });
      await svc.createProfile({ id: "b", label: "Beta" });
      const result = await svc.selectProfile("b");
      expect(result.ok).toBe(true);
      expect(result.message).toBe(RESTART_REQUIRED_MESSAGE);
    });
  });

  it("selects profile and returns restarting message when restart is supported", async () => {
    await withTempProfileHome(async () => {
      const restartController = {
        canRestart: async () => true,
        restart: async () => "restarted" as const
      };
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), restartController);
      await svc.createProfile({ id: "a", label: "Alpha" });
      await svc.createProfile({ id: "b", label: "Beta" });

      const result = await svc.selectProfile("b");

      expect(result.ok).toBe(true);
      expect(result.message).toBe("Profile selected. OpenCode is restarting.");
    });
  });

  it("falls back to restart-required message when restart fails", async () => {
    await withTempProfileHome(async () => {
      const restartController = {
        canRestart: async () => true,
        restart: async () => {
          throw new Error("restart failed");
        }
      };
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), restartController);
      await svc.createProfile({ id: "a", label: "Alpha" });
      await svc.createProfile({ id: "b", label: "Beta" });

      const result = await svc.selectProfile("b");

      expect(result.ok).toBe(true);
      expect(result.message).toBe(RESTART_REQUIRED_MESSAGE);
    });
  });

  it("switch flow does not read/copy credential files", async () => {
    await withTempProfileHome(async () => {
      const readSpy = vi.spyOn(fs, "readFile");
      const copySpy = vi.spyOn(fs, "copyFile");
      const cpSpy = vi.spyOn(fs, "cp");

      try {
        const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
        await svc.createProfile({ id: "alpha", label: "Alpha" });
        await svc.createProfile({ id: "beta", label: "Beta" });

        const result = await svc.selectProfile("beta");
        expect(result.ok).toBe(true);

        const suspiciousReads = readSpy.mock.calls
          .map(([target]) => String(target).toLowerCase())
          .filter((p) => p.includes("credential") || p.includes("auth") || p.includes("token"));

        expect(suspiciousReads).toEqual([]);
        expect(copySpy).not.toHaveBeenCalled();
        expect(cpSpy).not.toHaveBeenCalled();
      } finally {
        readSpy.mockRestore();
        copySpy.mockRestore();
        cpSpy.mockRestore();
      }
    });
  });

  it("blocks deleting active profile and allows deleting inactive", async () => {
    await withTempProfileHome(async () => {
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
      await svc.createProfile({ id: "a", label: "Alpha" });
      await svc.createProfile({ id: "b", label: "Beta" });

      const blocked = await svc.softDeleteProfile("a");
      expect(blocked.ok).toBe(false);

      const deleted = await svc.softDeleteProfile("b");
      expect(deleted.ok).toBe(true);
      expect((await svc.listProfiles()).some((p) => p.id === "b")).toBe(false);
    });
  });

  it("renames profile without changing id/data root", async () => {
    await withTempProfileHome(async () => {
      const svc = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
      await svc.createProfile({ id: "id1", label: "One" });
      await svc.renameProfile("id1", "Renamed");
      const list = await svc.listProfiles();
      expect(list[0].id).toBe("id1");
      expect(list[0].label).toBe("Renamed");
      expect(list[0].dataRoot).toBe(resolveProfileDataRoot("id1"));
    });
  });
});
