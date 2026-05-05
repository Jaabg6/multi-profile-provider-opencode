import fs from "node:fs/promises";
import path from "node:path";
import type { Registry } from "./types.js";

const EMPTY_REGISTRY: Registry = { version: 1, profiles: [] };

export type RegistryStatusState = "missing" | "empty" | "valid-with-profiles" | "malformed" | "unreadable";

export type RegistryStatus = {
  state: RegistryStatusState;
  profiles: Registry["profiles"];
  registry?: Registry;
  error?: string;
};

function isRegistry(value: unknown): value is Registry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Registry>;
  return candidate.version === 1 && Array.isArray(candidate.profiles);
}

function sortRegistry(registry: Registry): Registry {
  registry.profiles.sort((a, b) => a.id.localeCompare(b.id));
  return registry;
}

export class RegistryStore {
  constructor(private readonly registryPath: string) {}

  async read(): Promise<Registry> {
    try {
      const raw = await fs.readFile(this.registryPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isRegistry(parsed)) return structuredClone(EMPTY_REGISTRY);
      return sortRegistry(parsed);
    } catch {
      return structuredClone(EMPTY_REGISTRY);
    }
  }

  async readStatus(): Promise<RegistryStatus> {
    let raw: string;
    try {
      raw = await fs.readFile(this.registryPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "missing", profiles: [] };
      return { state: "unreadable", profiles: [], error: (error as Error).message };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRegistry(parsed)) return { state: "malformed", profiles: [], error: "Registry schema is invalid." };

      const registry = sortRegistry(parsed);
      const nonDeletedProfiles = registry.profiles.filter((profile) => profile.status !== "deleted");
      return {
        state: nonDeletedProfiles.length === 0 ? "empty" : "valid-with-profiles",
        profiles: registry.profiles,
        registry
      };
    } catch (error) {
      return { state: "malformed", profiles: [], error: (error as Error).message };
    }
  }

  async write(registry: Registry): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const tmp = `${this.registryPath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(registry, null, 2), "utf8");
    await fs.rename(tmp, this.registryPath);
  }
}
