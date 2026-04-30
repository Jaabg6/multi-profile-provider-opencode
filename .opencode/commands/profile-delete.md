---
description: Delete a non-active profile.
---

You are running `/profile-delete <id>`.

This slash command is an agent workflow prompt.
Execute the operation now.
DO NOT only paste/restate this template.

## Deterministic execution contract (tool-first, mandatory)

OpenCode slash commands are prompt-mediated and cannot force direct execution by themselves. To keep behavior deterministic, follow this exact order and DO the action (do not only print instructions):

1. Validate `$1` (`id`) is non-empty.
2. Ask for explicit confirmation in the conversation before deletion.
3. Security boundary: Do not read, copy, parse, or migrate credential/auth files.
4. After confirmation, execute exactly one tool call first:
   - `profile_delete` with JSON `{ "id": "<id>" }`.
5. If the tool is unavailable/unregistered, execute deterministic CLI fallback now:
   - Preferred: `node packages/cli/dist/index.js delete <id>`
   - Secondary only if available: `mpp delete <id>`
6. Return a short English result summary with the backend/CLI message.

If validation fails, return an actionable English error with usage: `/profile-delete <id>`.
