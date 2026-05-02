const CANONICAL = [
  "multi-profile-provider-opencode-plugin",
  "@multi-profile-provider/opencode-plugin",
  "multi-profile-provider-opencode"
];

export function normalizePluginIdentity(raw: string): string {
  return raw
    .trim()
    .replace(/^(npm:|jsr:)/, "")
    .replace(/@[^/]+$/u, "")
    .toLowerCase();
}

export function isCanonicalMppPlugin(raw: string, additionalNames: string[] = []): boolean {
  const normalized = normalizePluginIdentity(raw);
  return [...CANONICAL, ...additionalNames.map((item) => item.toLowerCase())].some(
    (candidate) => normalized === candidate.toLowerCase()
  );
}
