import fs from "node:fs/promises";
import path from "node:path";
import { resolveProfileDataRoot } from "./paths.js";
import { RESTART_REQUIRED_MESSAGE } from "./types.js";
import { assertUnique, validateId, validateLabel } from "./validation.js";
export class ProfileService {
    store;
    restartController;
    env;
    constructor(store, restartController, env = process.env) {
        this.store = store;
        this.restartController = restartController;
        this.env = env;
    }
    async createProfile(input) {
        validateId(input.id);
        validateLabel(input.label);
        const registry = await this.store.read();
        assertUnique(registry.profiles, input.id, input.label);
        const dataRoot = resolveProfileDataRoot(input.id, this.env);
        await fs.mkdir(dataRoot, { recursive: true });
        const now = new Date().toISOString();
        const profile = {
            id: input.id,
            label: input.label,
            status: registry.activeProfileId ? "inactive" : "active",
            dataRoot,
            createdAt: now,
            updatedAt: now
        };
        registry.profiles.push(profile);
        if (!registry.activeProfileId)
            registry.activeProfileId = profile.id;
        await this.store.write(registry);
        return { ok: true, message: "Profile created.", data: this.toView(profile, registry.activeProfileId) };
    }
    async listProfiles(includeDeleted = false) {
        const registry = await this.store.read();
        return registry.profiles
            .filter((p) => includeDeleted || p.status !== "deleted")
            .map((p) => this.toView(p, registry.activeProfileId));
    }
    async selectProfile(profileId) {
        const registry = await this.store.read();
        const profile = registry.profiles.find((p) => p.id === profileId && p.status !== "deleted");
        if (!profile)
            return { ok: false, message: "Profile not found." };
        await fs.mkdir(profile.dataRoot, { recursive: true });
        registry.activeProfileId = profile.id;
        registry.profiles = registry.profiles.map((p) => ({
            ...p,
            status: p.id === profile.id ? "active" : p.status === "deleted" ? "deleted" : "inactive",
            updatedAt: new Date().toISOString()
        }));
        await this.store.write(registry);
        if (await this.restartController.canRestart()) {
            try {
                const outcome = await this.restartController.restart("profile-switch");
                if (outcome === "restarted")
                    return { ok: true, message: "Profile selected. OpenCode is restarting." };
            }
            catch {
                // Fallback to manual restart message when runtime restart fails.
            }
        }
        return { ok: true, message: RESTART_REQUIRED_MESSAGE };
    }
    async resolveRuntimeBinding(profileId) {
        const registry = await this.store.read();
        const selectedId = profileId ?? registry.activeProfileId;
        if (!selectedId)
            return undefined;
        const profile = registry.profiles.find((p) => p.id === selectedId && p.status !== "deleted");
        if (!profile)
            return undefined;
        await fs.mkdir(profile.dataRoot, { recursive: true });
        const xdgRoot = path.resolve(profile.dataRoot, "xdg");
        return {
            profileId: profile.id,
            dataRoot: profile.dataRoot,
            env: {
                OPENCODE_HOME: profile.dataRoot,
                XDG_DATA_HOME: path.resolve(xdgRoot, "data"),
                XDG_STATE_HOME: path.resolve(xdgRoot, "state"),
                XDG_CACHE_HOME: path.resolve(xdgRoot, "cache"),
                OPENCODE_PROFILE_ID: profile.id,
                OPENCODE_PROFILE_DATA_ROOT: profile.dataRoot
            }
        };
    }
    async renameProfile(profileId, newLabel) {
        validateLabel(newLabel);
        const registry = await this.store.read();
        const duplicate = registry.profiles.find((p) => p.id !== profileId && p.label === newLabel && p.status !== "deleted");
        if (duplicate)
            return { ok: false, message: "Profile id or label already exists." };
        const profile = registry.profiles.find((p) => p.id === profileId && p.status !== "deleted");
        if (!profile)
            return { ok: false, message: "Profile not found." };
        profile.label = newLabel;
        profile.updatedAt = new Date().toISOString();
        await this.store.write(registry);
        return { ok: true, message: "Profile renamed." };
    }
    async softDeleteProfile(profileId) {
        const registry = await this.store.read();
        if (registry.activeProfileId === profileId) {
            return { ok: false, message: "Cannot delete active profile. Select another profile first." };
        }
        const profile = registry.profiles.find((p) => p.id === profileId && p.status !== "deleted");
        if (!profile)
            return { ok: false, message: "Profile not found." };
        profile.status = "deleted";
        profile.deletedAt = new Date().toISOString();
        profile.updatedAt = profile.deletedAt;
        await this.store.write(registry);
        return { ok: true, message: "Profile deleted." };
    }
    toView(profile, activeProfileId) {
        return {
            id: profile.id,
            label: profile.label,
            active: profile.id === activeProfileId,
            dataRoot: profile.dataRoot
        };
    }
}
//# sourceMappingURL=service.js.map