# @multi-profile-provider/opencode

The recommended setup entrypoint for Multi Profile Provider (MPP) on OpenCode. It gives users one explicit command that checks the stack, installs or verifies the lower-level packages, and leaves existing profile data safe.

```bash
npx @multi-profile-provider/opencode setup
```

> This package does not use npm `postinstall` hooks. Setup only runs when you invoke the command above.

## Quick path

1. Make sure the `opencode` CLI is available on your `PATH`.
2. Run:

   ```bash
   npx @multi-profile-provider/opencode setup
   ```

3. Start OpenCode through MPP:

   ```bash
   opencode-mpp
   # or
   mpp run
   ```

## What setup does

| Step | Behavior |
|------|----------|
| OpenCode check | Verifies `opencode --version` before plugin work starts. |
| CLI launchers | Verifies `mpp` and `opencode-mpp`; installs `@multi-profile-provider/cli` globally only from this explicit setup command when needed. |
| OpenCode plugin | Installs or verifies `multi-profile-provider-opencode-plugin@latest` with the OpenCode plugin command. |
| Profile registry | Creates a default `main` profile named `Main` only when the registry is valid and empty. |
| Next commands | Prints launch guidance for `opencode-mpp` and `mpp run`. |

## Safe to run again

Setup is designed to be idempotent:

- existing valid CLI and plugin state is reported as ready or skipped;
- existing non-deleted profiles are preserved;
- malformed or inaccessible registry files fail safely instead of being rewritten;
- no API keys, provider tokens, or other secrets are generated;
- setup does not delete, migrate, publish, or build anything.

## The default `Main` profile

If no non-deleted profiles exist, setup initializes:

| Field | Value |
|-------|-------|
| Profile id | `main` |
| Display name | `Main` |

This is profile metadata only. Your OpenCode provider credentials remain owned by OpenCode and are not inspected by MPP.

## Next commands after setup

```bash
opencode-mpp          # launch OpenCode with the active profile isolated
mpp run               # same launcher path, with optional OpenCode args
mpp status            # inspect the active profile
mpp profile           # open the terminal profile manager
```

Inside OpenCode, use the profile commands provided by the plugin, such as `/profile-status`, `/profile-create`, and `/profile-select`.

## Troubleshooting

| Symptom | What it means | What to do |
|---------|---------------|------------|
| `opencode` is missing | Setup cannot verify the OpenCode prerequisite. | Install OpenCode or add it to `PATH`, then rerun setup. |
| `mpp` or `opencode-mpp` is not ready | The CLI launcher could not be verified or installed. | Check npm global install permissions, then rerun setup. |
| Plugin install fails | OpenCode returned an error while installing the plugin. | Review the sanitized command output, fix the OpenCode/npm issue, then rerun setup. |
| Registry is malformed | Existing profile metadata is not valid JSON or does not match the expected shape. | Back up and repair the file manually before rerunning setup. Setup will not overwrite it. |
| Permission denied | Setup cannot read or write the profile registry path. | Fix filesystem permissions, then rerun setup. |

## Lower-level packages

Most users should start with `npx @multi-profile-provider/opencode setup`. The packages below remain available for direct-install or integration scenarios:

| Package | Role |
|---------|------|
| `@multi-profile-provider/cli` | Lower-level CLI and `opencode-mpp` launcher. |
| `@multi-profile-provider/core` | Lower-level profile registry and runtime isolation services. |
| `multi-profile-provider-opencode-plugin` | Compatibility OpenCode plugin package used by setup. |
| `@multi-profile-provider/opencode-plugin` | Scoped plugin adapter package for advanced/direct package usage. |

## Boundaries

Setup does not expose a separate lower-level CLI setup command, does not publish packages, does not run a build, and does not create secrets.
