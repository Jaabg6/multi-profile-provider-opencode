---
description: Create a profile with id and label.
---

You are running `/profile-create <id> <label>`.

IMPORTANT:
- This slash command is an agent workflow prompt.
- Execute the operation now.
- DO NOT only paste/restate this template.

Input contract:
- `$1` is the profile `id`.
- Remaining `$ARGUMENTS` text after `$1` is the profile `label`.

Steps:
1. Validate `id` exists and is not empty.
2. Validate `label` exists and is not empty.
3. Do not read, copy, parse, or migrate credential/auth files.
4. Execute tool call `profile_create` with JSON `{ "id": "<id>", "label": "<label>" }`.
5. If tool execution is unavailable, execute CLI fallback now and report output: `mpp create <id> <label>` (or `node packages/cli/dist/index.js create <id> <label>`).
6. Return a short English result summary with the backend message.

On validation failure, return an actionable English error with the expected usage.
