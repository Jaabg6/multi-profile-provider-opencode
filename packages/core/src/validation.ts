import path from "node:path";
import type { Profile } from "./types.js";

const RESERVED = /[<>:"|?*]/;
const TRAVERSAL = /\.\./;

export function validateId(id: string): void {
  if (!id || TRAVERSAL.test(id) || RESERVED.test(id) || id.includes("/") || id.includes("\\")) {
    throw new Error("Invalid profile id.");
  }
}

export function validateLabel(label: string): void {
  if (!label || label.trim().length < 2 || TRAVERSAL.test(label) || RESERVED.test(label)) {
    throw new Error("Invalid profile label.");
  }
}

export function assertUnique(profiles: Profile[], id: string, label: string): void {
  const conflict = profiles.find((p) => p.status !== "deleted" && (p.id === id || p.label === label));
  if (conflict) {
    throw new Error("Profile id or label already exists.");
  }
}

export function assertPathUnderBase(base: string, target: string): void {
  const rel = path.relative(base, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Resolved path is outside profile base path.");
  }
}
