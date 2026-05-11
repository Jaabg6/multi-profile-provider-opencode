# multi-profile-provider

Switch OpenCode provider profiles through OpenCode plugin tools. The normal workflow is plugin-owned: select a profile in OpenCode, then subsequent provider requests resolve auth from that selected profile.

## Quick Start

### 1. Install or refresh the OpenCode plugin

Preferred direct path:

```bash
opencode plugin -g multi-profile-provider-opencode-plugin
```

Helper path for fresh machines:

```bash
npx @multi-profile-provider/opencode setup
```

Setup verifies OpenCode, installs or refreshes the plugin, and initializes a default profile registry only when no profiles exist. Existing profiles, tokens, and config are preserved.

### 2. Use OpenCode plugin tools

From OpenCode, create/select profiles with plugin tools:

| Tool | Purpose |
|---|---|
| `profile_create` | Create a profile and reserve its data root. |
| `profile_select` | Make a profile the active provider-auth source. |
| `profile_status` | Show active profile and redacted provider readiness. |
| `profile_list` | List available profiles. |
| `profile_rename` | Rename a profile label. |
| `profile_delete` | Soft-delete a profile and clear active selection when needed. |
| `provider_account_upsert` | Store provider credentials for a profile. |

For CLI-based workflows outside OpenCode, use the launcher command:

```bash
# Via the global CLI
mpp run

# Or the dedicated launcher alias (same thing)
opencode-mpp
```

These select the active profile's runtime isolation and launch OpenCode with that profile's provider auth already configured.

## Update

```bash
npx @multi-profile-provider/opencode update
```

Update refreshes the plugin and preserves profiles, active selection, tokens, and config.

## Uninstall

Choose profile-data handling explicitly:

```bash
npx @multi-profile-provider/opencode uninstall --preserve-profiles
npx @multi-profile-provider/opencode uninstall --purge-profiles
```

Preserve keeps profile data for future reinstalls. Purge removes MPP profile roots after removing plugin config/cache targets.

## Legacy cleanup

Older installs may have global CLI launchers or local command docs from the previous launcher workflow. Safe cleanup path:

1. Run `npx @multi-profile-provider/opencode uninstall --preserve-profiles` first if you want to keep profile data.
2. Remove old global CLI packages only after confirming the plugin workflow is installed.
3. Do not delete legacy profile directories manually unless you intentionally chose `--purge-profiles` or have a backup.

## Package Roles

| Package | Role |
|---|---|
| `@multi-profile-provider/opencode` | User-facing lifecycle helper for setup, update, and uninstall only. |
| `multi-profile-provider-opencode-plugin` | Preferred OpenCode plugin package for `opencode plugin -g ...`. |
| `@multi-profile-provider/opencode-plugin` | Scoped plugin adapter package. |
| `@multi-profile-provider/core` | Shared profile, account, path, and auth-resolution domain. |
| `@multi-profile-provider/cli` | CLI launcher (`mpp` / `opencode-mpp`) for profile management and runtime-isolated OpenCode launches. |

## Security

Secrets are redacted from status/errors. Profile/account data is stored under cross-platform user-data paths with best-effort private permissions and atomic writes where supported.

See [`docs/security.md`](docs/security.md) for additional details.
