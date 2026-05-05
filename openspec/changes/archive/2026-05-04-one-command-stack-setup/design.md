# Design: One Command Stack Setup

## Technical Approach

Add a new workspace package `packages/opencode` published as `@multi-profile-provider/opencode`. Its bin is the product entrypoint for `npx @multi-profile-provider/opencode setup`, but setup logic lives in testable modules, not in npm lifecycle hooks. The flow is plan/apply-style: parse command, build setup checks, execute through injected filesystem/process/npm/OpenCode dependencies, initialize `Main` only for an empty valid registry, then print next commands.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Product package | Create `packages/opencode` named `@multi-profile-provider/opencode`, with bin `opencode-mpp-setup` pointing at `dist/index.js` and exports for programmatic setup. | Rename existing plugin package; use unscoped compatibility package. | Keeps installer UX distinct from plugin adapter packages and matches approved `npx` command. |
| Setup ownership | Put orchestration under `packages/cli/src/setup-stack/*`, exported by CLI; the new package delegates to it. | Duplicate setup in installer; put all setup in core. | CLI already owns process commands and bins; core should stay domain-focused. |
| Execution boundary | `createSetupPlan(args,deps)` + `executeSetupPlan(plan,deps)` with `SetupDeps` for fs, spawn, env/platform/cwd/homedir, write, now. | Direct `spawn`/`fs` calls in command handler. | Enables strict TDD with fake runners and temp fs. Mirrors uninstall-stack conventions. |
| CLI install | Prefer verifying local/current package execution first; when global launcher is missing, explicitly run npm global install for `@multi-profile-provider/cli` during `setup`, then verify `mpp` and `opencode-mpp`. | Depend on `postinstall`; only document manual install. | Setup is user-invoked, idempotent, and can truthfully make launchers ready. |
| Registry safety | Add strict registry read for setup that distinguishes missing, empty valid, existing valid, malformed, and inaccessible. | Reuse current `RegistryStore.read()` directly. | Current store returns empty on parse/read errors; setup spec requires fail-safe no-rewrite on malformed or permission errors. |

## Data Flow

```text
npx @multi-profile-provider/opencode setup
  -> packages/opencode/src/index.ts command parser
  -> @multi-profile-provider/cli setup-stack service
  -> deps.spawn/deps.fs + core ProfileService/registry helpers
  -> step report: done | skipped | failed + next commands
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/opencode/package.json` | Create | Scoped installer package with `type: module`, bin, exports, files, public publish config, dependency on `@multi-profile-provider/cli`. |
| `packages/opencode/src/index.ts` | Create | Thin command parser/help; calls setup orchestration for `setup`. |
| `packages/opencode/README.md` | Create | Primary product onboarding, prerequisites, verification, troubleshooting, next steps. |
| `packages/cli/src/setup-stack/{args,types,service}.ts` | Create | Plan/execution, step statuses, dependency interfaces, install/verify commands. |
| `packages/cli/src/index.ts` | Modify | Route optional `mpp setup-stack`/shared setup entry and export helpers without changing existing commands. |
| `packages/core/src/registry-store.ts` | Modify | Add strict read/status API; keep current forgiving `read()` behavior for existing commands unless tests drive broader change. |
| `README.md`, `docs/commands.md`, package READMEs | Modify | Point primary users to `npx @multi-profile-provider/opencode setup`; mark older packages as lower-level/direct install. |
| `package.json`, `tsconfig*.json` | Modify | Include new workspace package/project references as needed. |

## Interfaces / Contracts

```ts
type SetupStepStatus = "done" | "skipped" | "failed";
type SetupStep = { name: string; status: SetupStepStatus; message: string; detail?: string };
type SetupDeps = { env: NodeJS.ProcessEnv; platform: NodeJS.Platform; cwd: string; homedir: string; fs: SetupFs; spawn: SpawnLike; write(line: string): void; now?: () => Date };
type RegistryState = "missing" | "empty" | "existing" | "malformed" | "inaccessible";
```

OpenCode verification should run `opencode --version` before plugin work. Plugin setup should use the OpenCode CLI installation command verified by tests/docs; command failures must include sanitized command, exit code, stdout/stderr excerpt. npm commands must use `npm.cmd` on Windows and the existing `.cmd` wrapping helper.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | args/help, plan ordering, step status mapping, output copy | Vitest table tests and fake writer. |
| Contract | spawned commands for OpenCode/npm, Windows command resolution, failure redaction | Fake `SpawnLike`; no real install. |
| Temp fs | empty registry creates active `main/Main`; existing profiles skipped; malformed/inaccessible files untouched | `withTempProfileHome` and temp dirs. |
| CLI smoke/docs | `npx` package entry help/setup dispatch; README command presence | Import `runSetupCli`; docs snapshot/string checks. |

## Migration / Rollout

No data migration required. Implement as chained PRs: (1) package shell + command parser/tests, (2) setup orchestration + registry safety/tests, (3) docs updates and README checks. Do not run build; verification should use tests, typecheck, and lint only when requested by the apply phase.

## Open Questions

- [ ] Confirm exact OpenCode plugin install command/package identifier before implementation tests lock it in.
