# Tool and CLI Reference

## Official plugin install

- `opencode plugin @multi-profile-provider/opencode-plugin`

## End-user install (no repo clone)

1. Install plugin package in OpenCode:
   - `opencode plugin @multi-profile-provider/opencode-plugin`
2. Use CLI without global install (one-shot):
   - `npx @multi-profile-provider/cli status`
3. Or install CLI globally:
   - `npm install -g @multi-profile-provider/cli`
4. Launch OpenCode through MPP explicitly:
   - `mpp run [opencode args]`
   - `opencode-mpp [opencode args]`

## Plugin tools

- `profile_create {"id":"p1","label":"Profile One"}`: Create profile metadata and reserve isolated root.
- `profile_list {}`: List profile ID, label, active flag, and root.
- `profile_select {"id":"p1"}`: Mark active profile and return relaunch guidance with isolated runtime root.
- `profile_rename {"id":"p1","label":"Primary"}`: Rename mutable profile label.
- `profile_delete {"id":"p1"}`: Soft-delete non-active profile.
- `profile_status {}`: Return active profile plus profile list.

## CLI fallback

When plugin tools are unavailable, use the CLI package with equivalent operations.

Recommended setup from repository root (development only):

- `npm install`
- `npm run mpp:status`

If CLI is globally installed, bare `mpp ...` commands also work.

- `npm run mpp:status` (or `mpp status`): Show active profile and available profile count.
- `npm run mpp:profile` (or `mpp profile`): Render profile management screen (active profile, list, actions, restart-required notice).
- `mpp list`: List profiles as JSON.
- `mpp create <id> <label>`: Create profile metadata.
- `mpp select <id>`: Select active profile.
- `mpp delete <id>`: Delete a non-active profile.
- `mpp runtime`: Print active runtime binding (`OPENCODE_HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`, profile id, data root).
- `mpp run [opencode args]`: Launch OpenCode with active profile runtime env (including profile-scoped config/auth roots).
- `opencode-mpp [opencode args]`: Explicit launcher alias to `mpp run [opencode args]`.
- `npm run mpp:install` (or `mpp install`): Install transparent `opencode.cmd` shim (Windows) with backup/safety checks.
- `npm run mpp:uninstall` (or `mpp uninstall`): Restore original `opencode.cmd` from backup (Windows).

> `mpp install` is optional and advanced. Default recommendation is explicit launch via `mpp run` or `opencode-mpp`.

### Transparent launcher safety contract

- Never destroys the original OpenCode launcher.
- Creates `opencode.mpp-original.cmd` backup before writing shim.
- Refuses install if backup already exists but current launcher is not mpp-managed.
- Supports explicit launcher path override via `OPENCODE_BIN_PATH`.

## Visible OpenCode command catalog

OpenCode project command files in `.opencode/commands` expose a user-visible command surface:

- `/profile-status` — Show the active profile and available profiles.
- `/profile` — Open profile management screen and actions.
- `/profile-list` — List available profiles.
- `/profile-create <id> <label>` — Create a profile with id and label.
- `/profile-select <id>` — Select the active profile (must show `Restart OpenCode with OPENCODE_HOME=<profile-data-root> to isolate provider auth.` on success).
- `/profile-delete <id>` — Delete a non-active profile after explicit confirmation.

All command prompts and results are English-only.

## Command semantics (important)

- `/profile-*` commands are prompt templates and agent workflows.
- `/profile` and `/profile-*` commands are prompt templates and agent workflows.
- They are not direct UI buttons that execute backend logic by themselves.
- The workflow must be executed by the OpenCode agent (tool call first, CLI fallback second).
- If a command only inserts text, submit the message so the agent executes the described steps.
- Profile selection updates metadata for next launch only; restart is required to apply runtime auth/provider isolation in-process.

## Local plugin visibility semantics

- `.opencode/plugins/*.ts` enables local runtime auto-load for project plugins.
- `.opencode/opencode.json` with `plugin: []` means no config-managed installed plugin entries.
- Runtime load and installed-plugin list visibility are different signals and must be documented separately.
