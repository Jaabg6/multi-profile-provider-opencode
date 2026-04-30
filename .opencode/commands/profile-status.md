---
description: Show the active profile and available profiles.
---

You are running the `/profile-status` command.

IMPORTANT:
- This slash command is an agent workflow prompt.
- Execute the operation now.
- DO NOT only paste/restate this template.

1. Do not read, copy, parse, or migrate credential/auth files.
2. Execute tool call `profile_status` with `{}`.
3. If tool execution is unavailable, execute CLI fallback now and report output: `mpp status` (or `node packages/cli/dist/index.js status`).
4. Return an English summary with:
   - active profile id/label (or `none`)
   - available profile count
   - brief status message

If the backend returns an error, show an actionable English error.
