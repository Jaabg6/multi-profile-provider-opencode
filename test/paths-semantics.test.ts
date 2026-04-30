import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBaseRoot, resolveProfileDataRoot } from "@multi-profile-provider/core";

describe("path semantics", () => {
  it("resolves default base under user home when env is missing", () => {
    const base = resolveBaseRoot({});
    expect(base).toBe(path.resolve(path.join(os.homedir(), ".opencode-profiles")));
  });

  it("resolves profile data root under configured base", () => {
    const env = { OPENCODE_PROFILE_HOME: "C:\\profiles" };
    const root = resolveProfileDataRoot("gpt1", env);
    expect(root).toBe(path.resolve("C:\\profiles", "gpt1", "data"));
  });

  it("rejects path traversal attempts across separator styles", () => {
    const env = { OPENCODE_PROFILE_HOME: "C:\\profiles" };
    expect(() => resolveProfileDataRoot("..\\evil", env)).toThrow("Resolved path is outside profile base path.");
    expect(() => resolveProfileDataRoot("../evil", env)).toThrow("Resolved path is outside profile base path.");
  });
});
