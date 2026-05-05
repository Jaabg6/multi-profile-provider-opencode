# multi-profile-provider

<p align="center">
  Run multiple isolated OpenCode identities — different API keys, provider auth, and session state — from the same machine, without interference.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#cli-reference">CLI Reference</a> •
  <a href="#plugin-tools">Plugin Tools</a> •
  <a href="#uninstall">Uninstall</a> •
  <a href="docs/security.md">Security</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white" alt="Node.js" />
</p>

---

> *multi-profile-provider (MPP) — run OpenCode as many different identities as you need. Each profile gets its own isolated auth, API keys, and session state. Switch profiles in seconds.*

---

## The Problem

OpenCode stores all provider authentication, API keys, and session state in a single global directory. If you work with multiple accounts — personal and work, two different companies, a free tier alongside a paid one — they collide. Switching accounts means manually overwriting config files.

**MPP solves this** by giving each profile its own isolated data root and injecting the correct runtime environment every time OpenCode starts.

---

## Quick Start

Use the product setup package. It is the recommended path for npm and GitHub users because it verifies OpenCode, prepares the CLI launchers, installs or verifies the OpenCode plugin, and initializes an empty profile registry safely.

### 1. Run setup

```bash
npx @multi-profile-provider/opencode setup
```

Setup is explicit and safe to rerun. It does not use npm `postinstall` hooks, does not generate API keys or secrets, and does not overwrite existing profiles.

If your registry is valid and has no non-deleted profiles, setup creates the default `main` profile named `Main`. Existing profiles are preserved.

### 2. Launch OpenCode through MPP

```bash
opencode-mpp
# or
mpp run
```

### 3. Usage

From OpenCode's command palette, create and select a profile:

```
/profile-create work "Work Account"
/profile-select work
```

*(You can also manage profiles from your terminal using `mpp create work "Work Account"` and `mpp select work`)*.

**CRITICAL:** Close OpenCode and relaunch it through MPP after selecting a profile to apply isolation:

```bash
opencode-mpp
# or
mpp run
```

---

## Package Roles

Most users should start with `npx @multi-profile-provider/opencode setup`. The other packages remain lower-level or direct-install paths for advanced usage:

| Package | Role |
|---|---|
| `@multi-profile-provider/opencode` | Recommended product setup entrypoint. |
| `@multi-profile-provider/cli` | Lower-level CLI and `opencode-mpp` launcher. |
| `@multi-profile-provider/core` | Lower-level registry and runtime isolation library. |
| `multi-profile-provider-opencode-plugin` | Compatibility OpenCode plugin package used by setup. |
| `@multi-profile-provider/opencode-plugin` | Scoped plugin adapter package for direct installs. |

---

## How It Works

When you run `opencode-mpp` (or `mpp run`), MPP resolves the active profile and injects a scoped environment before OpenCode starts:

| Variable | Purpose |
|---|---|
| `XDG_DATA_HOME` | Isolates OpenCode's provider and auth data per profile |
| `OPENCODE_PROFILE_ID` | Signals the active profile ID to the process |
| `OPENCODE_PROFILE_DATA_ROOT` | Absolute path to the active profile's data root |

**Shared config stays shared.** Only runtime auth and provider state is isolated. You keep one central OpenCode configuration.

Profile metadata lives in `~/.opencode-profiles/registry.json`. Managed exclusively by MPP — do not edit it manually.

---

## CLI Reference

| Command | Description |
|---|---|
| `opencode-mpp` | Launch OpenCode with active profile isolation applied |
| `mpp run` | Same as above |
| `mpp status` | Show the currently active profile |
| `mpp list` | List all profiles |
| `mpp create <id> <label>` | Create a new profile |
| `mpp select <id>` | Switch active profile |
| `mpp rename <id> <label>` | Rename a profile's display label |
| `mpp delete <id>` | Soft-delete a non-active profile |
| `mpp profile` | Open the interactive TUI profile manager |

---

## Plugin Tools

When the plugin is installed, the OpenCode agent can call these tools directly:

| Tool | Description |
|---|---|
| `profile_create` | Create a profile and reserve its data root |
| `profile_list` | List all profiles with ID, label, active flag, and root |
| `profile_select` | Set the active profile (takes effect on next `opencode-mpp` launch) |
| `profile_rename` | Rename a profile's display label |
| `profile_delete` | Soft-delete a non-active profile |
| `profile_status` | Return the active profile and full list |

All tools return a consistent JSON envelope:

```json
{ "ok": true, "message": "Human-readable message.", "data": { ... } }
```

---

## Uninstall

Preview what would be removed (dry-run, no changes):

```bash
mpp uninstall-stack
```

Remove plugin config entries and the global CLI, keep profile data:

```bash
mpp uninstall-stack --apply
```

Full cleanup — stops OpenCode, removes profile data, clears npm cache:

```bash
mpp uninstall-stack --full
```

---

## Security

MPP manages **metadata and path routing only**. It does not read, parse, copy, or inspect any credential or API key files. Profile data roots are path-boundary-checked to prevent traversal attacks. Delete is always a soft-delete — data directories are not removed.

See [`docs/security.md`](docs/security.md) for full details.

---

## License

[MIT](LICENSE)
