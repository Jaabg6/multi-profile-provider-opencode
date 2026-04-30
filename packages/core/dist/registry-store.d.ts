import type { Registry } from "./types.js";
export declare class RegistryStore {
    private readonly registryPath;
    constructor(registryPath: string);
    read(): Promise<Registry>;
    write(registry: Registry): Promise<void>;
}
