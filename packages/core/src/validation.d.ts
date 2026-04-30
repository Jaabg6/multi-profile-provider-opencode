import type { Profile } from "./types.js";
export declare function validateId(id: string): void;
export declare function validateLabel(label: string): void;
export declare function assertUnique(profiles: Profile[], id: string, label: string): void;
export declare function assertPathUnderBase(base: string, target: string): void;
