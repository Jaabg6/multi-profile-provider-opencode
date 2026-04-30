import os from "node:os";
import path from "node:path";
import { assertPathUnderBase } from "./validation.js";
export function resolveBaseRoot(env = process.env) {
    const configured = env.OPENCODE_PROFILE_HOME;
    return path.resolve(configured ?? path.join(os.homedir(), ".opencode-profiles"));
}
export function resolveProfileDataRoot(profileId, env = process.env) {
    const base = resolveBaseRoot(env);
    const root = path.resolve(base, profileId, "data");
    assertPathUnderBase(base, root);
    return root;
}
export function resolveRegistryPath(env = process.env) {
    return path.resolve(resolveBaseRoot(env), "registry.json");
}
//# sourceMappingURL=paths.js.map