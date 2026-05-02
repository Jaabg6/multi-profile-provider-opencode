# Security Model (MVP)

- The system manages profile metadata and per-profile data root paths.
- Runtime isolation is applied by binding profile-scoped `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, and `XDG_CACHE_HOME` on relaunch.
- On Windows relaunches, `%APPDATA%` and `%LOCALAPPDATA%` are also bound to the active profile runtime root to avoid cross-profile auth reuse.
- The system does not parse, copy, or inspect auth/provider credential files.
- Profile roots are canonicalized and constrained under `OPENCODE_PROFILE_HOME` or `~/.opencode-profiles`.
- New profiles start as clean/disconnected runtime roots unless users explicitly import auth outside this tool.
- Delete operation is soft-delete and blocks active profile deletion.
