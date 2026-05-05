import fs from "node:fs/promises";
import path from "node:path";
const EMPTY_REGISTRY = { version: 1, profiles: [] };
function isRegistry(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return candidate.version === 1 && Array.isArray(candidate.profiles);
}
function sortRegistry(registry) {
    registry.profiles.sort((a, b) => a.id.localeCompare(b.id));
    return registry;
}
export class RegistryStore {
    registryPath;
    constructor(registryPath) {
        this.registryPath = registryPath;
    }
    async read() {
        try {
            const raw = await fs.readFile(this.registryPath, "utf8");
            const parsed = JSON.parse(raw);
            if (!isRegistry(parsed))
                return structuredClone(EMPTY_REGISTRY);
            return sortRegistry(parsed);
        }
        catch {
            return structuredClone(EMPTY_REGISTRY);
        }
    }
    async readStatus() {
        let raw;
        try {
            raw = await fs.readFile(this.registryPath, "utf8");
        }
        catch (error) {
            if (error.code === "ENOENT")
                return { state: "missing", profiles: [] };
            return { state: "unreadable", profiles: [], error: error.message };
        }
        try {
            const parsed = JSON.parse(raw);
            if (!isRegistry(parsed))
                return { state: "malformed", profiles: [], error: "Registry schema is invalid." };
            const registry = sortRegistry(parsed);
            const nonDeletedProfiles = registry.profiles.filter((profile) => profile.status !== "deleted");
            return {
                state: nonDeletedProfiles.length === 0 ? "empty" : "valid-with-profiles",
                profiles: registry.profiles,
                registry
            };
        }
        catch (error) {
            return { state: "malformed", profiles: [], error: error.message };
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