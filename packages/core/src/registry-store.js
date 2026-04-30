import fs from "node:fs/promises";
import path from "node:path";
const EMPTY_REGISTRY = { version: 1, profiles: [] };
export class RegistryStore {
    registryPath;
    constructor(registryPath) {
        this.registryPath = registryPath;
    }
    async read() {
        try {
            const raw = await fs.readFile(this.registryPath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed.version !== 1 || !Array.isArray(parsed.profiles))
                return structuredClone(EMPTY_REGISTRY);
            parsed.profiles.sort((a, b) => a.id.localeCompare(b.id));
            return parsed;
        }
        catch {
            return structuredClone(EMPTY_REGISTRY);
        }
    }
    async write(registry) {
        await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
        const tmp = `${this.registryPath}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(registry, null, 2), "utf8");
        await fs.rename(tmp, this.registryPath);
    }
}
//# sourceMappingURL=registry-store.js.map