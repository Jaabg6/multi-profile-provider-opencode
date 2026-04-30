import path from "node:path";
const RESERVED = /[<>:"|?*]/;
const TRAVERSAL = /\.\./;
export function validateId(id) {
    if (!id || TRAVERSAL.test(id) || RESERVED.test(id) || id.includes("/") || id.includes("\\")) {
        throw new Error("Invalid profile id.");
    }
}
export function validateLabel(label) {
    if (!label || label.trim().length < 2 || TRAVERSAL.test(label) || RESERVED.test(label)) {
        throw new Error("Invalid profile label.");
    }
}
export function assertUnique(profiles, id, label) {
    const conflict = profiles.find((p) => p.status !== "deleted" && (p.id === id || p.label === label));
    if (conflict) {
        throw new Error("Profile id or label already exists.");
    }
}
export function assertPathUnderBase(base, target) {
    const rel = path.relative(base, target);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error("Resolved path is outside profile base path.");
    }
}
//# sourceMappingURL=validation.js.map