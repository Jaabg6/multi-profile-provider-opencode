# Multi Profile Provider

OpenCode provider profile switcher plugin and core library for per-profile provider/auth state roots with shared central config.

## OpenCode Plugin Install

- `opencode plugin @multi-profile-provider/opencode-plugin`

## Plugin Tools

- `profile_create { "id": "p1", "label": "Profile One" }`
- `profile_list {}`
- `profile_select { "id": "p1" }`
- `profile_rename { "id": "p1", "label": "Primary" }`
- `profile_delete { "id": "p1" }`
- `profile_status {}`

All plugin tools return a JSON string with this shape:

`{"ok":true|false,"message":"English message","data":{...optional}}`

After selecting a profile, relaunch OpenCode with the active profile runtime env:

`Profile changed. Restart OpenCode with OPENCODE_HOME=<profile-data-root> to isolate provider auth.`

Runtime isolation is enforced by `mpp run` using profile-scoped `XDG_DATA_HOME`, `XDG_STATE_HOME`, and `XDG_CACHE_HOME` (plus legacy `OPENCODE_HOME`).

Runtime binding semantics:

- Shared/central config is preserved (`XDG_CONFIG_HOME` is inherited and not overridden).
- Provider/auth state is isolated per profile via `OPENCODE_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, and `XDG_CACHE_HOME`.
- Runtime output keeps explicit env names for the profile-scoped variables.

## CLI Fallback

If plugin tools are unavailable in a given environment, run the CLI package commands (`packages/cli`) for equivalent profile operations.

### CLI commands

- `mpp status`
- `mpp list`
- `mpp create <id> <label>`
- `mpp select <id>`
- `mpp delete <id>`
- `mpp runtime` (prints active runtime binding/env)
- `mpp run [opencode args]` (launches `opencode` with profile-isolated data/state/cache + `OPENCODE_HOME`, while preserving shared config)

## Visible OpenCode Commands (Ctrl+P)

This repository includes project commands under `.opencode/commands` so users can open OpenCode, press `Ctrl+P`, search `profile`, and run:

- `Profile: status` (`/profile-status`)
- `Profile: list` (`/profile-list`)
- `Profile: create` (`/profile-create <id> <label>`)
- `Profile: select` (`/profile-select <id>`)
- `Profile: delete` (`/profile-delete <id>`)

Important command semantics:

- `/profile-*` entries are slash-command prompt workflows.
- They do not perform backend operations until the agent executes the instructed tool/CLI steps.
- If the command inserts text into chat, send it so execution can happen.

After `profile-select`, show manual relaunch guidance with runtime binding:

`Restart OpenCode with OPENCODE_HOME=<profile-data-root> to isolate provider auth.`

## Local Plugin Visibility Semantics

- `.opencode/plugins/*.ts` is a local auto-load runtime path.
- `.opencode/opencode.json` with `plugin: []` means there are no config-managed installed-plugin-list entries.
- These are not contradictory: local plugin runtime load can work while installed-plugin list remains empty by design.

## Development

- `npm install`
- `npm run test`
- `npm run typecheck`

## Security Notes

- Runtime profile isolation via per-profile XDG runtime binding (`mpp run` or relaunch with env).
- No credential file parsing/copying/introspection in MVP.
- Canonical path boundary enforcement under profile base root.
