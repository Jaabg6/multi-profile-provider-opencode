# Security Model (MVP)

- The system only manages profile metadata and per-profile data root paths.
- The system does not parse, copy, or inspect auth/provider credential files.
- Profile roots are canonicalized and constrained under `OPENCODE_PROFILE_HOME` or `~/.opencode-profiles`.
- Delete operation is soft-delete and blocks active profile deletion.
