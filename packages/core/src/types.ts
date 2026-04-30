export type ProfileStatus = "active" | "inactive" | "deleted";

export interface Profile {
  id: string;
  label: string;
  status: ProfileStatus;
  dataRoot: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Registry {
  version: 1;
  activeProfileId?: string;
  profiles: Profile[];
}

export interface CreateProfileInput {
  id: string;
  label: string;
}

export interface ProfileView {
  id: string;
  label: string;
  active: boolean;
  dataRoot: string;
}

export interface CommandResult<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

export const RESTART_REQUIRED_MESSAGE =
  "Profile changed. Restart OpenCode to use this profile.";
