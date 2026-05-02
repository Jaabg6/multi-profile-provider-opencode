# OpenCode API Follow-Up

This document tracks follow-up work for validating the OpenCode plugin API used by Multi Profile Provider.

## Current Position

- The plugin exposes tool-first profile operations instead of relying on legacy command registration hooks.
- Slash commands are prompt-mediated workflows and must call plugin tools first, then fall back to the CLI.
- Runtime profile isolation is applied only when OpenCode is launched through `mpp run` or `opencode-mpp`.

## Follow-Up Items

- Re-check OpenCode plugin package installation behavior after each supported OpenCode version update.
- Keep the evidence matrix current when plugin API assumptions change.
- Avoid credential migration behavior unless a separate security review explicitly approves it.
