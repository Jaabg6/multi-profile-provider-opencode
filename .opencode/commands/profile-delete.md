---
description: Delete a non-active profile.
---

You are running `/profile-delete <id>`.

IMPORTANT:
- This slash command is an agent workflow prompt.
- Execute the operation now.
- DO NOT only paste/restate this template.

Steps:
1. Validate `$1` exists and is not empty.
2. Ask for explicit confirmation in the conversation before deletion.
3. Do not read, copy, parse, or migrate credential/auth files.
4. After confirmation, execute tool call `profile_delete` with JSON `{ "id": "<id>" }`.
5. If tool execution is unavailable, execute CLI fallback now and report output: `mpp delete <id>` (or `node packages/cli/dist/index.js delete <id>`).
6. Return a short English result summary with the backend message.

On validation failure, return an actionable English error with usage.
