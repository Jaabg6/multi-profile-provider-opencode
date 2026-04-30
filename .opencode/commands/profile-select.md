---
description: Select the active profile.
---

You are running `/profile-select <id>`.

This slash command is an agent workflow prompt.
Execute the operation now.
DO NOT only paste/restate this template.

## Deterministic execution contract (tool-first, mandatory)

OpenCode slash commands are prompt-mediated and cannot force direct execution by themselves. To keep behavior deterministic, follow this exact order and DO the action (do not only print instructions):

1. Validate `$1` (`id`) is non-empty.
2. Security boundary: Do not read, copy, parse, or migrate credential/auth files.
3. Execute exactly one tool call first:
   - `profile_select` with JSON `{ "id": "<id>" }`.
4. If the tool is unavailable/unregistered, execute deterministic CLI fallback now:
   - Preferred: `node packages/cli/dist/index.js select <id>`
   - Secondary only if available: `mpp select <id>`
5. On success, ALWAYS include this exact line:

`Restart OpenCode with OPENCODE_HOME=<profile-data-root> to isolate provider auth.`

6. Clarify semantics: shared OpenCode config (agents/commands/plugins) remains central; only provider/auth data/state is profile-isolated.

Do not claim automatic restart.
