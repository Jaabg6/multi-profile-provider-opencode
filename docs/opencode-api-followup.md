# OpenCode API Validation Follow-up

## Evidence Sources

- Docs research: `docs/opencode-api-validation/docs-research.md`
- Runtime/probe log: `docs/opencode-api-validation/runtime-log.md`
- Evidence matrix: `docs/opencode-api-validation/evidence-matrix.json`
- Runtime version: `1.14.29`
- Plugins docs page last updated: `2026-04-27` (accessed `2026-04-29`)

## Confirmed Mismatches vs Current Adapter Assumptions

1. `registerCommand` assumption in `packages/opencode-plugin/src/index.ts` is not part of the documented plugin contract.
2. `notify` assumption is not part of the documented plugin contract.
3. `canRestart` / `restart` assumptions are not part of the documented plugin contract.

## Confirmed Validated Surfaces

- Plugin load model (project/global plugin directories).
- Official installation/config command: `opencode plugin <module>` updates `.opencode/opencode.json` for project-local scope.
- npm plugin configuration and Bun-based install/cache behavior.
- Plugin function export shape and hooks model.
- Event/hook names including `shell.env`, `tool.execute.before/after`, `tui.command.execute`, and `tui.toast.show`.
- Custom tools support via plugin tool definitions.

## Runtime Clarification (Important)

- The plugin was loaded successfully in focused runtime validation (`opencode run "plugin load check" --print-logs --log-level DEBUG`).
- Probe execution was evidenced by `service=validate-opencode-plugin-api-probe` log lines and successful `validate_plugin_probe` execution.
- The earlier manual conclusion ("plugin not loaded") came from expecting a visible command entry, but official plugins do not provide `registerCommand` command-palette registration.

## Decision Gate

**Result: `REDESIGN_REQUIRED`**

### Why

Critical adapter assumptions (`registerCommand`, `notify`, restart API) are unsupported by official plugin docs and do not map directly to the documented plugin/hook model.

## Current-State Evidence for Redesign Apply

- Production adapter assumptions to remove were confirmed in baseline audit and now replaced:
  - `registerCommand`: removed from `packages/opencode-plugin/src/index.ts`
  - `notify`: removed from `packages/opencode-plugin/src/index.ts`
  - direct restart calls: removed from `packages/opencode-plugin/src/index.ts`
- Tool-first contract implemented via official plugin function export and custom tools (`profile_create`, `profile_list`, `profile_select`, `profile_rename`, `profile_delete`, `profile_status`).
- Prior validation evidence is explicitly referenced for contract legitimacy:
  - Topic key: `sdd/validate-opencode-plugin-api/apply-progress`
  - Observation: plugin load/install proof and documented API constraints
- No credential/auth-file introspection or copying was introduced.
- User-facing messages remain English-only and include manual relaunch guidance.

## Recommended Next Actions

1. Redesign `packages/opencode-plugin` around documented plugin exports and hooks.
2. Replace direct command-registration assumptions with validated alternatives (TUI command hook + custom tools + config-based flows).
3. Preserve restart fallback user copy, but move restart behavior to user-guided workflow since restart API is not documented.
4. Complete manual interactive runtime hook capture listed in `runtime-log.md` before final implementation lock.
