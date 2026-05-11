import type { ProfileView } from "./types.js";
export type PrepareOpenCodeAuthResult = {
    globalAuthPath: string;
    previousProfileAuthPath?: string;
    nextProfileAuthPath: string;
    backupAuthPath?: string;
    action: "copied-profile-auth" | "cleared-global-auth";
};
export declare function resolveDefaultOpenCodeAuthPath(env?: NodeJS.ProcessEnv): string;
export declare function resolveProfileOpenCodeAuthPath(profile: Pick<ProfileView, "dataRoot">): string;
export declare function prepareOpenCodeAuthForProfile(input: {
    previousProfile?: ProfileView;
    nextProfile: ProfileView;
    env?: NodeJS.ProcessEnv;
    now?: Date;
}): Promise<PrepareOpenCodeAuthResult>;
