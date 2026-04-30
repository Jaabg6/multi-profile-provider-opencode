---
description: List available profiles.
---

You are running the `/profile-list` command.

IMPORTANT:
- This slash command is an agent workflow prompt.
- Execute the operation now.
- DO NOT only paste/restate this template.

1. Do not read, copy, parse, or migrate credential/auth files.
2. Execute tool call `profile_list` with `{}`.
3. If tool execution is unavailable, execute CLI fallback now and report output: `mpp list` (or `node packages/cli/dist/index.js list`).
4. Render an English table/list with `id`, `label`, `active`, and `dataRoot` for each profile.

If no profiles exist, say `No profiles found.` in English.
