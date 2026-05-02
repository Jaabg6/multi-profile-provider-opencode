---
description: Open the interactive profile manager.
---

You are running the `/profile` command.

This slash command is an agent workflow prompt.
Execute the operation now.
DO NOT only paste/restate this template.

## Deterministic execution contract (tool-first, mandatory)

OpenCode slash commands are prompt-mediated and cannot force direct execution by themselves. To keep behavior deterministic, follow this exact order and DO the action (do not only print instructions):

1. Security boundary: Do not read, copy, parse, or migrate credential/auth files.
2. Execute exactly one tool call first:
   - `profile_ui` with `{}`.
3. If the tool is unavailable/unregistered, execute deterministic CLI fallback now:
   - Preferred: `node packages/cli/dist/index.js profile`
   - Secondary only if available: `mpp profile`
4. Return a short English result summary with the backend/CLI message.

If the backend/CLI returns an error, show an actionable English error.
