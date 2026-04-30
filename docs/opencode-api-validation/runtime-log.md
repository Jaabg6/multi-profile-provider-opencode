# OpenCode Runtime Validation Log

## Runtime Baseline

- Date (UTC): 2026-04-29
- Project: `multi-profile-provider`
- OpenCode version command: `opencode --version`
- Result: `1.14.29`

## Probe Artifact

- Probe path: `.opencode/plugins/validate-opencode-plugin-api.probe.ts`
- Probe goal: validate documented plugin export/hook surface without importing production adapter code.
- Safety: no credential/auth file inspection; no secret extraction.

## Probe Run 1

- Command: `opencode --help`
- Result: success (shows command surface, plugin management command, and runtime options)
- Evidence: confirms runtime availability and host versioned CLI in this environment.

## Probe Run 2

- Command: `opencode run "validation probe ping" --print-logs --log-level DEBUG`
- Result: partial success before timeout (30s)
- Observed facts (verbatim snippets):
  - `service=default version=1.14.29`
  - `directory=D:\Programacion\multi-profile-provider creating instance`
  - `service=config loading config from D:\Programacion\multi-profile-provider\.opencode\opencode.json`
  - `service=plugin ... loading internal plugin` (multiple internal plugins)
- Constraint: command exceeded agent timeout while session continued; full interactive event-path capture still requires manual host operation.

## Probe Run 3 (User Interactive Runtime Evidence)

- Command: `opencode . --print-logs --log-level DEBUG`
- OpenCode version observed in logs: `1.14.29`
- Runtime start directory: `D:\Programacion\multi-profile-provider`
- DB opened at: `C:\Users\Arcila.J\.opencode-profiles\GPT2\data\opencode\opencode.db`
- Observed interpretation: runtime is using an isolated profile data root consistent with the existing profile-based launch context.

### Observed in logs

- Internal TUI plugins loaded:
  - `internal:home-footer`
  - `internal:home-tips`
  - `internal:sidebar-context`
  - `internal:sidebar-mcp`
  - `internal:sidebar-lsp`
  - `internal:sidebar-todo`
  - `internal:sidebar-files`
  - `internal:sidebar-footer`
  - `internal:plugin-manager`
- UI rendered and showed `ctrl+p commands`.
- Session was user-aborted.

### NOT observed in logs

- No clear line confirming load/execution of `.opencode/plugins/validate-opencode-plugin-api.probe.ts`.
- No clear line for `tui.command.execute`.
- No clear line for `tui.toast.show`.
- No clear lines for `tool.execute.before` / `tool.execute.after`.

### Evidence impact

- Runtime baseline and internal host plugin initialization are now directly evidenced by user interactive logs.
- Probe-specific lifecycle evidence remains incomplete; related matrix rows remain `CONDITIONAL` or `UNKNOWN` where runtime proof is required.

## Probe Run 4 (Focused Non-Interactive Validation)

- Command: `opencode plugin opencode-wakatime --print-logs --log-level DEBUG`
- Result: success
- Observed facts (verbatim snippets):
  - `Install plugin opencode-wakatime`
  - `Plugin config updated`
  - `Added to D:\Programacion\multi-profile-provider\.opencode\opencode.json`
  - `Installed opencode-wakatime`
- Evidence: confirms official installation mechanism in OpenCode 1.14.29 updates project config at `.opencode/opencode.json`.
- Cleanup: removed temporary validation install entry by resetting `.opencode/opencode.json` plugin list to `[]` after evidence capture.

- Command: `opencode run "plugin load check" --print-logs --log-level DEBUG`
- Result: success
- Observed facts (verbatim snippets):
  - `service=config loading config from D:\Programacion\multi-profile-provider\.opencode\opencode.json`
  - `DEBUG ... service=validate-opencode-plugin-api-probe Event received: session.updated`
  - `Plugin load check passed: \`validate_plugin_probe\` executed successfully.`
- Evidence: confirms project-local probe file was loaded and executed under OpenCode 1.14.29.

## Root Cause Analysis: Why probe looked "not loaded"

1. The previous manual check relied on visible TUI command surfaces (`ctrl+p commands`) and expected a plugin command entry.
2. Official plugin docs do not expose a plugin `registerCommand` API; command-like behavior comes from hooks/events and custom tools.
3. Therefore, absence of a visible command entry is not evidence that plugin loading failed.
4. Focused runtime evidence from Run 4 confirms the probe did load and execute.

## Runtime Validation Status

The following validations are prepared and partially executed non-interactively:

1. Runtime version detection: **done** (`1.14.29`).
2. Probe creation and wiring: **done** (file created in project plugin directory).
3. Interactive hook invocation (`event`, `shell.env`, `tool.execute.before/after`, `tui.command.execute`, `tui.toast.show`): **manual host step required**.

## Verification Commands Executed

1. `npm run typecheck` → PASS
2. `npx vitest run test/english-copy-validation.test.ts test/opencode-api-evidence-matrix.test.ts` → PASS (2 files, 2 tests)
3. `opencode --version` → `1.14.29`
4. `opencode run "validation probe ping" --print-logs --log-level DEBUG` → PARTIAL (timed out after 30s with startup evidence captured)
5. `opencode . --print-logs --log-level DEBUG` → PARTIAL (interactive baseline captured by user: TUI init + internal plugins + profile DB path; probe/hook lines not confirmed)
6. `opencode plugin opencode-wakatime --print-logs --log-level DEBUG` → PASS (official plugin install/config path validated)
7. `opencode run "plugin load check" --print-logs --log-level DEBUG` → PASS (probe load and execution evidenced)
8. `npm run typecheck` → PASS
9. `npx vitest run test/english-copy-validation.test.ts test/opencode-api-evidence-matrix.test.ts` → PASS

## Manual Host Action Required (Exact)

The agent cannot safely drive an interactive OpenCode host session end-to-end from this environment to trigger all TUI events deterministically.

Please run these steps locally in an interactive terminal:

1. Start OpenCode in this repository root:
   - `opencode . --print-logs --log-level DEBUG`
2. Trigger at least one command-like action inside OpenCode that emits `tui.command.execute`.
3. Trigger one toast path (`tui.toast.show`) if available.
4. Execute one tool operation so `tool.execute.before/after` can be observed.
5. Capture relevant log lines verbatim and append them under this section.

Until these steps are completed, runtime-only event rows should be treated as `CONDITIONAL` or `UNKNOWN` where applicable.
