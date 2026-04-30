---
description: Select the active profile.
---

You are running `/profile-select <id>`.

IMPORTANT:
- This slash command is an agent workflow prompt.
- Execute the operation now.
- DO NOT only paste/restate this template.

Steps:
1. Validate `$1` exists and is not empty.
2. Do not read, copy, parse, or migrate credential/auth files.
3. Execute tool call `profile_select` with JSON `{ "id": "<id>" }`.
4. If tool execution is unavailable, execute CLI fallback now and report output: `mpp select <id>` (or `node packages/cli/dist/index.js select <id>`).
5. On success, ALWAYS include this exact line:

`Restart OpenCode to use this profile.`

Do not claim automatic restart.
