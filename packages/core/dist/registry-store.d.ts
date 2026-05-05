import type { Registry } from "./types.js";
export type RegistryStatusState = "missing" | "empty" | "valid-with-profiles" | "malformed" | "unreadable";
export type RegistryStatus = {
    state: RegistryStatusState;
    profiles: Registry["profiles"];
    registry?: Registry;
    error?: string;
};
export declare class RegistryStore {
    private readonly registryPath;
    constructor(registryPath: string);
    read(): Promise<Registry>;
    readStatus(): Promise<RegistryStatus>;
    write(registry: Registry): Promise<void>;
}
