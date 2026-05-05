# Tool and CLI Reference

## Recommended setup

For end users, the recommended setup flow is the product package:

```bash
npx @multi-profile-provider/opencode setup
```

That command verifies OpenCode, prepares the `mpp` and `opencode-mpp` launchers, installs or verifies the OpenCode plugin, safely initializes an empty registry with `main` / `Main`, and prints the next launch commands.

After setup, launch OpenCode through MPP explicitly:

- `opencode-mpp [opencode args]`
- `mpp run [opencode args]`

## Package roles

| Package | Role |
|---------|------|
| `@multi-profile-provider/opencode` | Recommended product setup entrypoint. |
| `@multi-profile-provider/cli` | Lower-level CLI and launcher package for direct-install workflows. |
| `@multi-profile-provider/core` | Lower-level profile registry and runtime isolation library. |
| `multi-profile-provider-opencode-plugin` | Compatibility plugin package installed by the setup flow. |
| `@multi-profile-provider/opencode-plugin` | Scoped plugin adapter package for direct installs. |

Use repository-local commands for development before publication. Use npm/OpenCode plugin install commands only after the relevant package is published.

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
- `mpp runtime`: Print active runtime binding (`XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`, profile id, data root).
- `mpp run [opencode args]`: Launch OpenCode with active profile runtime env (including profile-scoped config/auth roots).
- `opencode-mpp [opencode args]`: Explicit launcher alias to `mpp run [opencode args]`.
- `mpp uninstall-stack [flags]`: Cross-platform uninstall/cleanup command (dry-run by default).

Uninstall flags:
- `--apply`: execute mutations.
- `--full`: implies `--apply --stop-opencode --remove-profiles --clean-npm-cache --verbose-report`.
- `--stop-opencode`, `--remove-profiles`, `--clean-npm-cache`, `--verbose-report`.
- `--plugin-name <name>`: adds custom plugin identity target.

### Launcher behavior

- `opencode-mpp` and `mpp run` apply runtime isolation (`XDG_DATA_HOME` and profile markers).
- Normal `opencode` remains unchanged and does not auto-route through MPP.

## Visible OpenCode command catalog

OpenCode project command files in `.opencode/commands` expose a user-visible command surface:

- `/profile-status` — Show the active profile and available profiles.
- `/profile` — Open profile management screen and actions.
- `/profile-list` — List available profiles.
- `/profile-create <id> <label>` — Create a profile with id and label.
- `/profile-select <id>` — Select the active profile (must show restart guidance to relaunch through `mpp run`/`opencode-mpp` for isolation).
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
