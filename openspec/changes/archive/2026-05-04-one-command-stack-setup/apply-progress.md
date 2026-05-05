# Apply Progress: One Command Stack Setup

**Change**: one-command-stack-setup  
**Mode**: Strict TDD  
**PR Boundary**: Verification-fix slice only (`stacked-to-main`)  

## Completed Tasks

- [x] 1.1 RED: Add tests for `packages/opencode/src/index.ts` help, unsupported subcommand, and `setup` dispatch.
- [x] 1.2 GREEN: Create `packages/opencode/package.json`, `src/index.ts`, tsconfig references, and workspace wiring for `@multi-profile-provider/opencode` bin.
- [x] 1.3 REFACTOR: Keep parser thin; export `runSetupCli(args,deps)` without direct fs/spawn mutation.
- [x] 2.1 RED: Add core tests for missing, empty, existing, malformed, and inaccessible registry status.
- [x] 2.2 GREEN: Add strict registry status/read API in `packages/core/src/registry-store.ts`; preserve forgiving `read()` behavior.
- [x] 2.3 RED: Add tests that empty registry creates `main/Main`, existing profiles are untouched, and malformed files remain unchanged.
- [x] 2.4 GREEN: Implement default `Main` creation via setup-only safe path; generate no secrets.
- [x] 3.1 RED: Test setup-stack plan order: OpenCode, CLI bins, plugin, registry, next commands.
- [x] 3.2 GREEN: Implement `SetupDeps`, `createSetupPlan`, and `executeSetupPlan` with injected process/env/write/registry dependencies.
- [x] 3.3 RED: Test OpenCode missing stops before plugin install and reports remediation.
- [x] 3.4 GREEN: Verify `opencode --version`; sanitize failed command context.
- [x] 3.5 RED: Test npm global install fallback, `npm.cmd` on Windows, and launcher verification failures.
- [x] 3.6 GREEN: Implement CLI install/verification and step statuses `done|skipped|failed`.
- [x] 3.7 RED/GREEN: Test and implement fakeable `opencode plugin -g multi-profile-provider-opencode-plugin@latest` command.
- [x] 4.1 RED: Optional `packages/cli/src/index.ts` `setup-stack` route intentionally not added; user explicitly kept the public setup entrypoint limited to `npx @multi-profile-provider/opencode setup`.
- [x] 4.2 GREEN: Wire installer package to CLI setup service and print product header, checks, summary, `opencode-mpp`, and `mpp run` guidance.
- [x] 4.3 REFACTOR: Confirm installer output and exit behavior remain normalized through existing tests; no direct CLI setup entrypoint was added.
- [x] 5.1 RED: Add README/docs string tests for `npx @multi-profile-provider/opencode setup` and direct-install positioning.
- [x] 5.2 GREEN: Create `packages/opencode/README.md`; update `README.md`, `docs/commands.md`, and package READMEs.
- [x] 5.3 Verify with `npm test`, `npm run typecheck`, and `npm run lint` as needed; DO NOT run `npm run build`.
- [x] VF-1 RED/GREEN: Add and pass CLI npm/global install failure coverage; setup reports npm failure, redacts unsafe output, does not claim `mpp`/`opencode-mpp` readiness, and stops before plugin work.
- [x] VF-2 RED/GREEN: Add and pass plugin install failure coverage with sanitized command/output context and no secret leakage.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `test/opencode-installer-cli.test.ts` | Unit | N/A (new package/files) | ✅ Written first; failed because `packages/opencode/src/index.ts` did not exist | ✅ `npm test -- test/opencode-installer-cli.test.ts` passed 4/4 after implementation | ✅ Covered help, unsupported subcommand, injected setup dispatch, and default setup path | ✅ Direct invocation guard added so importing the module has no CLI side effects |
| 1.2 | `test/opencode-installer-cli.test.ts` | Unit/contract | N/A (new package/files) | ✅ Tests referenced missing package shell before production files existed | ✅ Workspace package, bin metadata, tsconfig reference, and lockfile wiring added; targeted tests passed | ✅ Package shell exercised through user-visible command contract, not metadata-only assertions | ✅ Kept package metadata minimal and aligned with existing workspace packages |
| 1.3 | `test/opencode-installer-cli.test.ts` | Unit | N/A (new package/files) | ✅ Test required injected `runSetup` dispatch contract before implementation | ✅ `runSetupCli(args,deps)` returns exit codes and writes runner output without direct fs/spawn mutation | ✅ Injected runner and default setup path exercise different paths | ✅ Parser remains thin; setup orchestration is delegated |
| 2.1 | `test/registry-store-status.test.ts` | Unit/temp fs | ✅ Baseline `npm test -- test/profile-service.test.ts test/opencode-installer-cli.test.ts` passed 13/13 | ✅ New tests failed with `store.readStatus is not a function` | ✅ `npm test -- test/registry-store-status.test.ts test/setup-stack/service.test.ts test/opencode-installer-cli.test.ts` passed 13/13 after implementation | ✅ Covered missing, empty, valid-with-profiles, malformed, and unreadable directory path states | ✅ Extracted registry validation/sorting helpers |
| 2.2 | `test/registry-store-status.test.ts` | Unit/temp fs | ✅ Existing forgiving profile service tests passed before modification | ✅ Malformed test required strict status while `read()` still returned empty | ✅ Strict `readStatus()` added and forgiving `read()` preserved; targeted tests passed | ✅ Schema-invalid/malformed and unreadable are separate states; malformed file bytes remain unchanged | ✅ Added exported status types for setup consumers |
| 2.3 | `test/setup-stack/service.test.ts` | Unit/temp fs | ✅ Baseline setup-related tests passed before modifying installer/core | ✅ Setup tests required empty registry creation, existing preservation, and malformed no-rewrite before service existed | ✅ Setup-stack registry execution passed with fake deps and temp profile home | ✅ Empty, existing, and malformed states each exercise different write/no-write paths | ✅ Registry initialization is isolated to setup-stack execution |
| 2.4 | `test/setup-stack/service.test.ts` | Unit/temp fs | ✅ Core safety baseline passed before implementation | ✅ Test asserted `main/Main` without API/key/secret content | ✅ `createMainRegistry()` writes only profile metadata and no secrets; targeted tests passed | ✅ Existing profile preservation and malformed blocked path prevent over-broad writes | ✅ Main creation is pure except final store write |
| 3.1 | `test/setup-stack/service.test.ts` | Unit | N/A (new setup-stack files) | ✅ Plan-order test failed because `packages/cli/src/setup-stack/service.js` did not exist | ✅ `createSetupPlan()` returns ordered planned steps | ✅ Plan includes OpenCode, CLI, plugin, registry, and next commands in one contract | ✅ Step names centralized |
| 3.2 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new setup-stack files) | ✅ Tests referenced missing `SetupDeps`, `createSetupPlan`, and `executeSetupPlan` contracts | ✅ Implemented fakeable spawn/env/write/registry dependency contract; targeted tests passed | ✅ Fake deps cover success, blocked, Windows, and registry branches | ✅ Kept process execution behind `SpawnLike` |
| 3.3 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new behavior) | ✅ OpenCode-missing test required early stop before plugin install | ✅ `opencode --version` failure returns failed step and halts execution | ✅ Assertion verifies only one spawn call happened, proving plugin was not attempted | ✅ Remediation copy kept in failed step detail/output |
| 3.4 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new behavior) | ✅ Failure-output test required command context without real process execution | ✅ Failed command details include sanitized command, exit code, and stdout/stderr excerpt | ✅ Sanitizer covers token/api-key/secret markers and truncates output | ✅ Shared `failureDetail()` helper reused by OpenCode/CLI/plugin failures |
| 3.5 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new behavior) | ✅ Windows fallback test required `npm.cmd` and both launcher checks | ✅ CLI fallback runs `npm.cmd install -g @multi-profile-provider/cli@latest` and re-verifies `mpp`/`opencode-mpp` | ✅ Non-Windows success path is covered by setup success tests; Windows path uses different command | ✅ `npmCommand()` helper isolates platform decision |
| 3.6 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new behavior) | ✅ Step-status tests required `done`, `skipped`, and `failed` visible output | ✅ Execution writes `[status] Step: message` lines and returns `ok` based on failed steps | ✅ Existing CLI/registry produce skipped paths; failures stop safely | ✅ Step writing normalized through `writeStep()` |
| 3.7 | `test/setup-stack/service.test.ts` | Unit/contract | N/A (new behavior) | ✅ Plan/execution tests required plugin step to be fakeable and ordered after OpenCode/CLI | ✅ Plugin command uses fake `spawn("opencode", ["plugin", "-g", "multi-profile-provider-opencode-plugin@latest"])` | ✅ OpenCode-missing test proves plugin is skipped when prerequisite fails | ✅ Command remains centralized in setup-stack service for docs polish |
| 4.1 | `test/setup-docs.test.ts` | Unit/docs | ✅ `npm test -- test/setup-docs.test.ts` initially failed before docs updates | ✅ Docs test explicitly asserted public docs do not mention `mpp setup-stack` | ✅ Passing after docs preserved only `npx @multi-profile-provider/opencode setup` as setup entrypoint | ✅ Root, command docs, product README, and package README coverage exercise different docs | ✅ Optional direct CLI route treated as intentionally out of scope per user decision |
| 4.2 | `test/setup-stack/service.test.ts`, `test/opencode-installer-cli.test.ts` | Unit/contract | ✅ Previous installer CLI tests passed before replacing placeholder path | ✅ Installer wiring test required `createSetupDeps` injection and real planner/executor output | ✅ `runSetupCli(["setup"])` delegates to setup-stack and returns setup result exit code | ✅ Injected runner and default planner/executor paths are both covered | ✅ Parser remains thin; real external installs remain fakeable in tests |
| 4.3 | `test/opencode-installer-cli.test.ts`, `test/setup-docs.test.ts` | Unit/contract/docs | ✅ Existing installer output/exit tests were already green before docs polish | ✅ Docs test protected against adding a second direct setup command | ✅ `npm test` confirmed installer output/exit behavior still passes | ✅ Success, unsupported command, and setup dispatch paths cover output/exit behavior | ✅ No production output change needed; no direct CLI setup entrypoint exists |
| 5.1 | `test/setup-docs.test.ts` | Unit/docs | ✅ Baseline `npm test -- test/english-copy-validation.test.ts` passed 1/1 before docs changes | ✅ `npm test -- test/setup-docs.test.ts` failed 3/3 before docs updates | ✅ Passing after README/docs updates | ✅ Product README, root/docs, and package README direct-install positioning are separate assertions | ✅ Assertions focus on user-visible behavior, not markdown formatting internals |
| 5.2 | `test/setup-docs.test.ts`, `test/english-copy-validation.test.ts` | Unit/docs | ✅ Setup docs test red captured missing content before doc edits | ✅ README/docs tests required recommended command, safety topics, troubleshooting, lower-level package positioning | ✅ `npm test -- test/setup-docs.test.ts test/english-copy-validation.test.ts` passed 4/4 | ✅ New product README plus root/docs plus four package READMEs covered | ✅ Added package READMEs to English copy guardrail |
| 5.3 | Full verification | Unit/typecheck/lint | ✅ Targeted docs tests passed before full verification | ✅ Verification task required full test/typecheck/lint status | ✅ `npm test` passed 19 files / 76 tests; `npm run typecheck` passed | ✅ Lint re-check confirmed same tooling blocker as prior slice | ✅ Build not run, per instruction |
| VF-1 | `test/setup-stack/service.test.ts` | Unit/contract | ✅ `npm test -- test/setup-stack/service.test.ts` passed 6/6 before modifying setup-stack test/service files | ✅ New npm global install failure test failed because `password=hunter2` was not redacted | ✅ `npm test -- test/setup-stack/service.test.ts` passed 8/8 after sanitizer update | ✅ Test covers command context, redacted password/token output, no ready claim, and no plugin command after CLI failure | ✅ Minimal sanitizer expansion only; setup flow logic already matched the spec |
| VF-2 | `test/setup-stack/service.test.ts` | Unit/contract | ✅ Same setup-stack safety net passed 6/6 before modification | ✅ New plugin failure test failed because `Authorization: Bearer secret-token` and `password=opensesame` were not redacted | ✅ `npm test -- test/setup-stack/service.test.ts` passed 8/8 after sanitizer update | ✅ Test covers plugin command context, api_key/bearer/password redaction, no raw secret leakage, and no registry success after plugin failure | ✅ Reused shared `failureDetail()` path; no new public entrypoint added |

## Test Summary

- **Total change-scope tests**: 18 (4 installer CLI, 3 registry status, 8 setup-stack, 3 setup docs)
- **Full suite passing**: 78 tests across 19 files
- **Layers used**: Unit (18), Integration (0), E2E (0)
- **Approval tests**: None — existing behavior was protected by baseline/targeted runs before modification
- **Pure functions/contracts created**: `readStatus`, `createSetupPlan`, `executeSetupPlan`, `runSetupStack`, `SetupDeps`, `SetupStep`, `SetupResult`, `createDefaultSetupDeps`

## Verification

- `npm test -- test/english-copy-validation.test.ts` — PASS baseline before docs changes (1 test)
- `npm test -- test/setup-docs.test.ts` — RED initially: 3 failing docs positioning tests before README/docs updates
- `npm test -- test/setup-docs.test.ts` — PASS after docs updates (3 tests)
- `npm test -- test/setup-docs.test.ts test/english-copy-validation.test.ts` — PASS (4 tests)
- `npm test` — PASS (19 files, 76 tests)
- `npm run typecheck` — PASS
- `npm run lint` — FAIL/BLOCKED: `eslint` executable is still not installed/resolvable in this workspace (`"eslint" no se reconoce como un comando interno o externo...`)
- `npm test -- test/setup-stack/service.test.ts` — PASS baseline before verification-fix changes (6 tests)
- `npm test -- test/setup-stack/service.test.ts` — RED after adding failure coverage: 2 failing tests for missing password/Bearer redaction
- `npm test -- test/setup-stack/service.test.ts` — PASS after sanitizer update (8 tests)
- `npm test` — PASS after verification-fix slice (19 files, 78 tests)
- `npm run typecheck` — PASS after verification-fix slice
- `npm run lint` — FAIL/BLOCKED after verification-fix slice: `eslint` executable is still not installed/resolvable in this workspace (`"eslint" no se reconoce como un comando interno o externo...`)
- Build was not run.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `packages/core/src/registry-store.ts` | Modified | Added strict registry status API and validation helpers while preserving forgiving `read()`. |
| `packages/core/package.json` | Modified | Added core subpath exports for `paths`, `registry-store`, and `types`. |
| `packages/cli/src/setup-stack/types.ts` | Created | Added setup step/status, dependency, plan, spawn, and result contracts. |
| `packages/cli/src/setup-stack/service.ts` | Created | Added fakeable setup plan/executor, OpenCode/CLI/plugin checks, safe registry initialization, and output statuses. |
| `packages/cli/src/setup-stack/index.ts` | Created | Exported setup-stack contracts/services. |
| `packages/cli/package.json` | Modified | Added setup-stack export and aligned local core dependency to `0.1.1`. |
| `packages/opencode/src/index.ts` | Created/Modified | Product installer parser delegates only `setup` to setup-stack through injected dependencies. |
| `packages/opencode/README.md` | Created/Modified | Replaced placeholder with polished product setup README covering setup, safety, `Main`, troubleshooting, package roles, and next commands. |
| `README.md` | Modified | Updated Quick Start to recommend `npx @multi-profile-provider/opencode setup` and added package role positioning. |
| `docs/commands.md` | Modified | Replaced older multi-step install guidance with recommended setup flow and lower-level package role table. |
| `packages/cli/README.md` | Modified | Positioned CLI as lower-level/direct-install path behind product setup. |
| `packages/core/README.md` | Modified | Positioned core as lower-level integration package behind product setup. |
| `packages/opencode-plugin/README.md` | Modified | Positioned scoped plugin as lower-level/direct-install path behind product setup. |
| `packages/opencode-plugin-public/README.md` | Modified | Positioned compatibility plugin as direct-install path normally managed by setup. |
| `test/setup-docs.test.ts` | Created | Added README/docs string tests for recommended setup and lower-level/direct-install positioning. |
| `test/english-copy-validation.test.ts` | Modified | Added package READMEs to English-only guardrail. |
| `test/registry-store-status.test.ts` | Created | Added strict status tests for missing/empty/valid/malformed/unreadable registries. |
| `test/setup-stack/service.test.ts` | Created | Added fake-dependency setup orchestration and safe registry initialization tests. |
| `test/setup-stack/service.test.ts` | Modified | Added CLI npm install failure and plugin install failure contract tests with unsafe output redaction assertions. |
| `packages/cli/src/setup-stack/service.ts` | Modified | Expanded shared failure-output sanitizer to redact `password=` and `Authorization: Bearer ...` values in addition to existing token/api-key/secret patterns. |
| `test/opencode-installer-cli.test.ts` | Created/Modified | Tests installer help, unsupported command, dispatch, and setup dependency injection. |
| `package-lock.json` | Modified | Reflected workspace/package dependency alignment and PR1 package entries. |
| `tsconfig.json` | Modified | Added product/setup-stack project references. |
| `packages/*/dist/**` | Modified/Created | Pre-existing tracked distribution artifacts remain aligned from prior slice; build was not run in this slice. |
| `openspec/changes/one-command-stack-setup/tasks.md` | Modified | Marked final docs/polish tasks complete and resolved chain strategy to `stacked-to-main`. |
| `openspec/changes/one-command-stack-setup/apply-progress.md` | Modified | Merged prior PR1/PR2 progress with final PR3 docs/polish progress. |

## Deviations from Design

- `packages/cli/src/index.ts` does not expose `mpp setup-stack`; this is intentional per user decision. The only public setup entrypoint remains `npx @multi-profile-provider/opencode setup`.
- SetupDeps still injects process/env/write/spawn and registry-store creation rather than a complete `fs` facade; existing tests keep registry mutation fakeable through temp profile homes and store injection.

## Issues Found

- `npm run lint` remains blocked because `eslint` is not installed/resolvable in the workspace.
- Verification-fix slice closed the two CRITICAL gaps from verify: CLI npm/global install failure coverage and plugin install failure sanitized context coverage.
- Documentation is prepared for npm/GitHub users, but no publish or push was performed.
- No build was run by instruction; tracked dist artifacts shown in the working tree are from prior slice state.

## Remaining Tasks

- [ ] Resolve lint tool availability (`eslint`) or update the lint script/dependency in a dedicated tooling slice.
- [ ] Rerun SDD verify for `one-command-stack-setup` to confirm the two CRITICAL gaps are now resolved.
- [ ] Publish to npm and push to GitHub only after explicit user approval.

## Workload / PR Boundary

- Mode: stacked PR slice
- Current work unit: Verification-fix slice only
- Boundary: starts from failed sdd-verify report and ends with the two CRITICAL failure scenarios tested/passing plus minimal sanitizer hardening.
- Estimated review budget impact: small autonomous test/sanitizer slice; no docs or public entrypoint changes.

## Status

20/20 original tasks complete plus 2/2 verification-fix gaps addressed. Ready to rerun SDD verify; publish/push prep should wait for explicit user instruction.
