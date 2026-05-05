# Tasks: One Command Stack Setup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1,400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 installer shell → PR2 setup orchestration/registry safety → PR3 docs/verification polish |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: Resolved by apply prompt — `stacked-to-main`
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add `@multi-profile-provider/opencode` package shell and parser | PR 1 | Tests verify help/unsupported/setup dispatch; rollback removes package/reference. |
| 2 | Add safe setup orchestration and registry status API | PR 2 | Core behavior with fake deps/temp fs; rollback removes setup-stack exports. |
| 3 | Add docs and README verification | PR 3 | Docs-only plus string tests; rollback reverts docs. |

## Phase 1: Installer Package Shell (RED/GREEN/REFACTOR)

- [x] 1.1 RED: Add tests for `packages/opencode/src/index.ts` help, unsupported subcommand, and `setup` dispatch.
- [x] 1.2 GREEN: Create `packages/opencode/package.json`, `src/index.ts`, tsconfig references, and workspace wiring for `@multi-profile-provider/opencode` bin.
- [x] 1.3 REFACTOR: Keep parser thin; export `runSetupCli(args,deps)` without direct fs/spawn mutation.

## Phase 2: Registry Safety Foundation (RED/GREEN/REFACTOR)

- [x] 2.1 RED: Add core tests for missing, empty, existing, malformed, and inaccessible registry status.
- [x] 2.2 GREEN: Add strict registry status/read API in `packages/core/src/registry-store.ts`; preserve forgiving `read()` behavior.
- [x] 2.3 RED: Add tests that empty registry creates `main/Main`, existing profiles are untouched, and malformed files remain unchanged.
- [x] 2.4 GREEN: Implement default `Main` creation via setup-only safe path; generate no secrets.

## Phase 3: Setup Orchestration (RED/GREEN/REFACTOR)

- [x] 3.1 RED: Test `packages/cli/src/setup-stack/{args,types,service}.ts` plan order: OpenCode, CLI bins, plugin, registry, next commands.
- [x] 3.2 GREEN: Implement `SetupDeps`, `createSetupPlan`, and `executeSetupPlan` with injected fs/spawn/env/write/now.
- [x] 3.3 RED: Test OpenCode missing stops before plugin install and reports remediation.
- [x] 3.4 GREEN: Verify `opencode --version`; sanitize failed command context.
- [x] 3.5 RED: Test npm global install fallback, `npm.cmd` on Windows, and `mpp`/`opencode-mpp` verification failures.
- [x] 3.6 GREEN: Implement CLI install/verification and step statuses `done|skipped|failed`.
- [x] 3.7 RED/GREEN: Test and implement plugin install/verify command once exact OpenCode plugin identifier is confirmed.

## Phase 4: CLI Wiring and UX

- [x] 4.1 RED: Optional `packages/cli/src/index.ts` `setup-stack` route intentionally not added; user explicitly kept the public setup entrypoint limited to `npx @multi-profile-provider/opencode setup`.
- [x] 4.2 GREEN: Wire installer package to CLI setup service and print product header, checks, summary, `opencode-mpp`, and `mpp run` guidance.
- [x] 4.3 REFACTOR: Confirm installer output and exit behavior remain normalized through existing tests; no direct CLI setup entrypoint was added.

## Phase 5: Documentation and Verification

- [x] 5.1 RED: Add README/docs string tests for `npx @multi-profile-provider/opencode setup` and direct-install positioning.
- [x] 5.2 GREEN: Create `packages/opencode/README.md`; update `README.md`, `docs/commands.md`, and package READMEs.
- [x] 5.3 Verify with `npm test`, `npm run typecheck`, and `npm run lint` as needed; DO NOT run `npm run build`.
