# TODO — Next Workday Handoff

## 1) Current status
- Multi-profile provider is wired as a local OpenCode plugin and slash commands are available.
- Manual checks were started; command behavior and deterministic execution path still need hardening.

## 2) What works now
- Local plugin bridge is loading from `.opencode/plugins/multi-profile-provider.local.ts`.
- Slash command surface is visible under `/`.
- During manual test, `/profile-list` executed and returned: `No profiles found.`

## 3) Main architectural concern
- Current slash commands are agent-mediated prompt workflows.
- Profile operations should be deterministic and CLI-first.
- Agent tools should be optional fallback only, never a required execution path.

## 4) Next tasks
- Make visible commands deterministic or provide a reliable CLI-first workflow from OpenCode.
- Finish/create CLI commands for profile list/create/select/delete/status if any are incomplete.
- Update slash commands to call or guide the deterministic CLI flow.
- Validate end-to-end:
  - `/profile-create test-a "Test Profile A"`
  - `/profile-status`
  - `/profile-select test-a`
  - `/profile-delete test-a`
- Verify all command/user-facing copy is English-only.
- Verify there is no credential/auth-file introspection.
- Update SDD artifacts, or create a new SDD change focused on deterministic command execution.
- Run tests and typecheck (no separate build step).

## 5) Important facts
- Local plugin loads from `.opencode/plugins/multi-profile-provider.local.ts`.
- `.opencode/opencode.json` may contain `plugin: []`; this does **not** block local plugin-folder loading.
- Commands appear under slash `/`, not Ctrl+P.
- `/profile-list` returned `No profiles found.` during manual test.

## 6) Cleanup / undo note for local plugin bridge
- If you need to disable the local bridge temporarily, remove or rename `.opencode/plugins/multi-profile-provider.local.ts` and restart OpenCode.
- Re-enable by restoring the file name/path and restarting OpenCode.
