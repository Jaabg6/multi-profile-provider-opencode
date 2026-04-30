# Tool and CLI Reference

## Official plugin install

- `opencode plugin @multi-profile-provider/opencode-plugin`

## Plugin tools

- `profile_create {"id":"p1","label":"Profile One"}`: Create profile metadata and reserve isolated root.
- `profile_list {}`: List profile ID, label, active flag, and root.
- `profile_select {"id":"p1"}`: Mark active profile and return manual relaunch guidance.
- `profile_rename {"id":"p1","label":"Primary"}`: Rename mutable profile label.
- `profile_delete {"id":"p1"}`: Soft-delete non-active profile.
- `profile_status {}`: Return active profile plus profile list.

## CLI fallback

When plugin tools are unavailable, use the CLI package with equivalent operations (`create`, `list`, `select`, `rename`, `delete`).
