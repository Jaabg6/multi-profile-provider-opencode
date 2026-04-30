import type { RegistryStore } from "./registry-store.js";
import type { RestartController } from "./restart-controller.js";
import { type CommandResult, type CreateProfileInput, type ProfileView, type RuntimeBinding } from "./types.js";
export declare class ProfileService {
    private readonly store;
    private readonly restartController;
    private readonly env;
    constructor(store: RegistryStore, restartController: RestartController, env?: NodeJS.ProcessEnv);
    createProfile(input: CreateProfileInput): Promise<CommandResult<ProfileView>>;
    listProfiles(includeDeleted?: boolean): Promise<ProfileView[]>;
    selectProfile(profileId: string): Promise<CommandResult>;
    resolveRuntimeBinding(profileId?: string): Promise<RuntimeBinding | undefined>;
    renameProfile(profileId: string, newLabel: string): Promise<CommandResult>;
    softDeleteProfile(profileId: string): Promise<CommandResult>;
    private toView;
}
