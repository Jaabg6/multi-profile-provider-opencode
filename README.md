# multi-profile-provider

> Run multiple isolated OpenCode identities — different API keys, provider auth, and state — from the same machine, without interference.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

## The Problem

OpenCode stores all provider authentication, API keys, and session state in a single global directory. If you work with multiple accounts — personal and work, two different companies, a free tier alongside a paid one — they collide. Switching accounts means manually overwriting config files. There is no built-in concept of a "profile."

**multi-profile-provider (MPP)** solves this by giving each profile its own isolated data root and injecting the correct runtime environment every time OpenCode starts.

---

## How It Works

MPP is a **monorepo of three packages** that work together:

```
packages/
├── core/          — Profile registry, CRUD service, path resolution, runtime binding
├── cli/           — mpp CLI binary + explicit opencode-mpp launcher
└── opencode-plugin/ — OpenCode plugin exposing profile tools + TUI screen
```

### Isolation Model

When you run `mpp run` (or `opencode-mpp`), MPP resolves the active profile and injects a scoped environment before starting OpenCode:

| Variable | Purpose |
|---|---|
| `XDG_DATA_HOME` | Isolates OpenCode's provider/auth data per profile |
| `OPENCODE_PROFILE_ID` | Signals the active profile ID to the process |
| `OPENCODE_PROFILE_DATA_ROOT` | Absolute path to the active profile's data root |

Each profile's data root is stored under `~/.opencode-profiles/<profile-id>/data/` by default. Override the base with `OPENCODE_PROFILE_HOME`.

**Shared config stays shared.** Only runtime auth/provider state is isolated. You keep one central OpenCode configuration.

### `opencode-mpp` vs normal `opencode`

- `opencode-mpp` (or `mpp run`) starts OpenCode with profile isolation variables injected.
- Normal `opencode` remains untouched and runs without MPP runtime isolation.

### Registry

Profile metadata (IDs, labels, active profile, data roots) lives in `~/.opencode-profiles/registry.json`. The file is managed exclusively by MPP — never edit it manually.

---

## Quick Start

> Package publish status: `@multi-profile-provider/core`, `@multi-profile-provider/cli`, and `@multi-profile-provider/opencode-plugin` are not published yet. Use **Option C** for local development right now.

### Option A — OpenCode Plugin (after npm publish)

The npm package is not published yet. After publication, install the plugin globally in OpenCode:

``` 
opencode plugin -g multi-profile-provider-opencode-plugin
```

Local (project-scoped) install is optional if you intentionally want per-project plugin scope:

```bash
opencode plugin multi-profile-provider-opencode-plugin
```

Scoped fallback (if your OpenCode version/environment fully supports scoped package install):

```bash
opencode plugin @multi-profile-provider/opencode-plugin
```

Then manage profiles directly from OpenCode's command palette (`Ctrl+P → profile`):

- `/profile` — Open the interactive profile manager
- `/profile-create <id> <label>` — Create a new profile
- `/profile-select <id>` — Switch active profile
- `/profile-list` — List all profiles
- `/profile-status` — Show currently active profile
- `/profile-delete <id>` — Delete a non-active profile

After selecting a profile, **restart OpenCode through MPP** to apply the isolated runtime:

```bash
mpp run
# or
opencode-mpp
```

### Option B — CLI only (after npm publish)

The npm package is not published yet. After publication, install the CLI globally:

```bash
npm install -g @multi-profile-provider/cli
```

Manage profiles from your terminal:

```bash
mpp create work "Work Account"
mpp create personal "Personal Account"
mpp select work
mpp run                  # launches OpenCode with work profile isolation
```

### Option C — Local development from this repository (available now)

```bash
npm install
npm run mpp:status
npm run mpp:profile
```

---

## Usage Flow (end-user)

Use this as the shortest reliable flow once packages are published:

1. **Install plugin and/or CLI** (see Option A / B above).
2. **Create profiles** (for example `work`, `personal`).
3. **Select one active profile**.
4. **Launch OpenCode through MPP** using `mpp run` or `opencode-mpp`.
5. When you want a different identity, **switch profile and relaunch through MPP**.

Example CLI flow:

```bash
mpp create work "Work Account"
mpp create personal "Personal Account"
mpp select work
mpp run
```

Example plugin-first flow:

1. Install the plugin in OpenCode.
2. Run `/profile-create work "Work Account"`.
3. Run `/profile-select work`.
4. Close OpenCode and relaunch via `mpp run` (or `opencode-mpp`).

Important: profile selection updates metadata for the **next launch**. Isolation is applied only when OpenCode starts through MPP.

---

## CLI Reference

| Command | Description |
|---|---|
| `mpp status` | Show active profile and total profile count |
| `mpp list` | List all profiles as JSON |
| `mpp create <id> <label>` | Create a new profile |
| `mpp select <id>` | Set the active profile |
| `mpp rename <id> <label>` | Rename a profile's display label |
| `mpp delete <id>` | Soft-delete a non-active profile |
| `mpp runtime` | Print the runtime env binding for the active profile |
| `mpp run [opencode args]` | Launch OpenCode with active profile isolation applied |
| `opencode-mpp [opencode args]` | Explicit launcher alias for `mpp run` |
| `mpp profile` | Open the interactive TUI profile manager |

### From the repository root (development)

```bash
npm run mpp:status
npm run mpp:profile
```

---

## Plugin Tool Reference

When the plugin is installed, the OpenCode agent can call these tools directly:

| Tool | Input | Description |
|---|---|---|
| `profile_create` | `{ "id": "p1", "label": "Profile One" }` | Create profile and reserve its data root |
| `profile_list` | `{}` | List profiles with ID, label, active flag, and root |
| `profile_select` | `{ "id": "p1" }` | Mark active profile, returns relaunch guidance |
| `profile_rename` | `{ "id": "p1", "label": "Primary" }` | Rename profile label |
| `profile_delete` | `{ "id": "p1" }` | Soft-delete a non-active profile |
| `profile_status` | `{}` | Return active profile and full list |

All tools return a consistent JSON envelope:

```json
{ "ok": true, "message": "Human-readable message.", "data": { ... } }
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENCODE_PROFILE_HOME` | `~/.opencode-profiles` | Base directory for all profile data roots and the registry |

---

## Uninstall / Cleanup (plugin + MPP)

This section removes BOTH parts from a client machine:

1. OpenCode plugin package(s)
2. MPP runtime tooling (CLI + launchers + optional profile data)

### Platform-neutral checklist

1. Close OpenCode.
2. Remove the plugin package from OpenCode configuration (package names to remove):
   - `multi-profile-provider-opencode-plugin`
   - `@multi-profile-provider/opencode-plugin`
3. Remove MPP CLI if globally installed:
   - `npm uninstall -g @multi-profile-provider/cli`
4. Verify launchers are gone from PATH:
   - `mpp`
   - `opencode-mpp`
5. Optional data cleanup:
   - Remove MPP profile home (`OPENCODE_PROFILE_HOME` if customized, otherwise `~/.opencode-profiles`).

### OS-specific examples

#### Windows (automated script in this repository)

This repo includes a Windows cleanup script:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1
```

Apply real changes:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1 -Apply
```

Optional full cleanup (stop OpenCode, remove profiles, clean npm cache):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1 -Apply -StopOpenCode -RemoveProfiles -CleanNpmCache -VerboseReport
```

#### macOS / Linux (manual)

```bash
# 1) Remove global CLI if present
npm uninstall -g @multi-profile-provider/cli

# 2) Optional: remove MPP profile data (default location)
rm -rf ~/.opencode-profiles
```

Then remove plugin entries from your OpenCode plugin configuration if they are still present (`multi-profile-provider-opencode-plugin` and/or `@multi-profile-provider/opencode-plugin`).

### Notes

- This repository verifies install commands and the Windows uninstall automation script.
- OpenCode plugin **removal** command syntax can differ by OpenCode version; if your version has a plugin uninstall command, remove the two package names above with that command.
- Deleting `~/.opencode-profiles` removes per-profile auth/session state managed by MPP.

---

## Security Model

- MPP manages **metadata and path routing only**. It does not read, parse, copy, or inspect any credential or API key files.
- Profile data roots are canonicalized and path-boundary-checked under `OPENCODE_PROFILE_HOME` to prevent traversal attacks.
- Delete is always a **soft-delete** — metadata is marked deleted, data directories are not removed.
- Active profile cannot be deleted. You must select another profile first.
- New profiles start as clean, disconnected runtime roots. No existing auth is carried over.

See [`docs/security.md`](docs/security.md) for full details.

---

## Development

### Requirements

- Node.js 22+
- npm 10+

### Setup

```bash
git clone https://github.com/your-org/multi-profile-provider
cd multi-profile-provider
npm install
```

### Commands

```bash
npm run test          # Run test suite with coverage (≥70% threshold)
npm run test:watch    # Watch mode
npm run typecheck     # Full monorepo type check
npm run build         # Build all packages
npm run lint          # ESLint across all .ts files
```

### Release dry-run (no publish)

Run package readiness checks without publishing:

```bash
npm run release:pack:dry-run
```

Planned publish order (when ready):

1. `@multi-profile-provider/core`
2. `@multi-profile-provider/cli`
3. `@multi-profile-provider/opencode-plugin`
4. `multi-profile-provider-opencode-plugin` (compatibility alias for plugin install)

Example future commands (AFTER npm publication is approved):

```bash
npm publish --workspace @multi-profile-provider/core --access public
npm publish --workspace @multi-profile-provider/cli --access public
npm publish --workspace @multi-profile-provider/opencode-plugin --access public
npm publish --workspace multi-profile-provider-opencode-plugin --access public
```

### Project Structure

```
packages/
├── core/
│   ├── src/service.ts         — ProfileService: CRUD + runtime binding resolution
│   ├── src/registry-store.ts  — JSON registry read/write
│   ├── src/paths.ts           — Profile path resolution (data root, registry)
│   ├── src/validation.ts      — ID/label rules + path boundary enforcement
│   └── src/types.ts           — Profile, Registry, RuntimeBinding, CommandResult
├── cli/
│   ├── src/index.ts           — mpp CLI commands + TUI rendering
│   ├── src/opencode-mpp.ts    — opencode-mpp launcher entry point
└── opencode-plugin/
    ├── src/index.ts           — OpenCode plugin definition + tool handlers
    └── src/tui.tsx            — Profile TUI (SolidJS + @opentui/solid)

test/
├── profile-service.test.ts    — Core service unit tests
├── cli-smoke.test.ts          — CLI command smoke tests
├── plugin-adapter.test.ts     — Plugin tool adapter tests
├── profile-tui.test.ts        — TUI component tests
├── paths-semantics.test.ts    — Path resolution semantics
└── ...
```

### Architecture Notes

- **`@multi-profile-provider/core`** has zero runtime dependencies. It is a pure TypeScript library.
- **`@multi-profile-provider/cli`** depends only on core. No CLI framework — commands are hand-rolled to keep the binary minimal.
- **`@multi-profile-provider/opencode-plugin`** uses `@opencode-ai/plugin` SDK, SolidJS, and `@opentui/solid` for the TUI.
- All packages are ESM-only (`"type": "module"`).
- Tests run with Vitest against the `test/` directory at the workspace root (cross-package integration possible by design).

---

## Roadmap

- [ ] Publish all packages to npm (`core` -> `cli` -> `opencode-plugin`)
- [ ] Improve release automation around `npm pack --dry-run`
- [ ] Profile import/export

---

## License

[MIT](LICENSE)
