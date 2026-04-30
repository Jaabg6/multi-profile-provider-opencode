import fs from "node:fs/promises";
import path from "node:path";
import type { Registry } from "./types.js";

const EMPTY_REGISTRY: Registry = { version: 1, profiles: [] };

export class RegistryStore {
  constructor(private readonly registryPath: string) {}

  async read(): Promise<Registry> {
    try {
      const raw = await fs.readFile(this.registryPath, "utf8");
      const parsed = JSON.parse(raw) as Registry;
      if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) return structuredClone(EMPTY_REGISTRY);
      parsed.profiles.sort((a, b) => a.id.localeCompare(b.id));
      return parsed;
    } catch {
      return structuredClone(EMPTY_REGISTRY);
    }
  }

  async write(registry: Registry): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const tmp = `${this.registryPath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(registry, null, 2), "utf8");
    await fs.rename(tmp, this.registryPath);
  }
}
