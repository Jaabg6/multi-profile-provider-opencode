const CANONICAL = [
    "multi-profile-provider-opencode-plugin",
    "@multi-profile-provider/opencode-plugin",
    "multi-profile-provider-opencode"
];
export function normalizePluginIdentity(raw) {
    return raw
        .trim()
        .replace(/^(npm:|jsr:)/, "")
        .replace(/@[^/]+$/u, "")
        .toLowerCase();
}
export function isCanonicalMppPlugin(raw, additionalNames = []) {
    const normalized = normalizePluginIdentity(raw);
    return [...CANONICAL, ...additionalNames.map((item) => item.toLowerCase())].some((candidate) => normalized === candidate.toLowerCase());
}
//# sourceMappingURL=matching.js.map