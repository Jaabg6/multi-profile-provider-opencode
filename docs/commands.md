# Tool and CLI Reference

## Official plugin install

- `opencode plugin @multi-profile-provider/opencode-plugin`

## Plugin tools

- `profile_create {"id":"p1","label":"Profile One"}`: Create profile metadata and reserve isolated root.
- `profile_list {}`: List profile ID, label, active flag, and root.
- `profile_select {"id":"p1"}`: Mark active profile and return relaunch guidance with isolated runtime root.
- `profile_rename {"id":"p1","label":"Primary"}`: Rename mutable profile label.
- `profile_delete {"id":"p1"}`: Soft-delete non-active profile.
- `profile_status {}`: Return active profile plus profile list.

## CLI fallback

When plugin tools are unavailable, use the CLI package with equivalent operations.

- `mpp status`: Show active profile and available profile count.
- `mpp list`: List profiles as JSON.
- `mpp create <id> <label>`: Create profile metadata.
- `mpp select <id>`: Select active profile.
- `mpp delete <id>`: Delete a non-active profile.
- `mpp runtime`: Print active runtime binding (`OPENCODE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`, profile id, data root).
- `mpp run [opencode args]`: Launch OpenCode with active profile runtime env (shared config is preserved; no `XDG_CONFIG_HOME` override).

## Visible OpenCode command catalog

OpenCode project command files in `.opencode/commands` expose a user-visible command surface:

- `/profile-status` — Show the active profile and available profiles.
- `/profile-list` — List available profiles.
- `/profile-create <id> <label>` — Create a profile with id and label.
- `/profile-select <id>` — Select the active profile (must show `Restart OpenCode with OPENCODE_HOME=<profile-data-root> to isolate provider auth.` on success).
- `/profile-delete <id>` — Delete a non-active profile after explicit confirmation.

All command prompts and results are English-only.

## Command semantics (important)

- `/profile-*` commands are prompt templates and agent workflows.
- They are not direct UI buttons that execute backend logic by themselves.
- The workflow must be executed by the OpenCode agent (tool call first, CLI fallback second).
- If a command only inserts text, submit the message so the agent executes the described steps.

## Local plugin visibility semantics

- `.opencode/plugins/*.ts` enables local runtime auto-load for project plugins.
- `.opencode/opencode.json` with `plugin: []` means no config-managed installed plugin entries.
- Runtime load and installed-plugin list visibility are different signals and must be documented separately.
