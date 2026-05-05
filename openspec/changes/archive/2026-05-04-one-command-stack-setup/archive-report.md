# Archive Report: One Command Stack Setup

**Change**: `one-command-stack-setup`  
**Project**: `multi-profile-provider-opencode`  
**Archive date**: 2026-05-04  
**Artifact store mode**: hybrid  
**Delivery strategy**: auto-chain  
**Chain strategy**: stacked-to-main  
**Final verification verdict**: PASS WITH WARNINGS

## Executive Summary

The `one-command-stack-setup` SDD change is complete and archived with warnings. It adds the product setup capability centered on `npx @multi-profile-provider/opencode setup`, backed by fakeable setup orchestration, strict registry status handling, safe default `Main` profile creation, and README/docs positioning for primary and lower-level install paths.

No npm publish, GitHub push, git commit, or build was performed during archive. The archive preserves verification warnings for lint tooling, plugin idempotency proof, and intentionally low real-spawn/main branch coverage.

## Artifact Traceability

| Artifact | Engram observation | OpenSpec path |
|---|---:|---|
| Exploration | #1446 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/exploration.md` |
| Proposal | #1450 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/proposal.md` |
| Spec | #1452 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/specs/opencode-stack-setup/spec.md` |
| Design | #1454 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/design.md` |
| Tasks | #1457 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/tasks.md` |
| Apply progress | #1461 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/apply-progress.md` |
| Verify report | #1474 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/verify-report.md` |
| Archive report | #1483 | `openspec/changes/archive/2026-05-04-one-command-stack-setup/archive-report.md` |

## Source of Truth Update

| Domain | Action | Details |
|---|---|---|
| `opencode-stack-setup` | Created | Main spec did not exist; copied the completed delta spec into `openspec/specs/opencode-stack-setup/spec.md` with 11 requirements/scenarios preserved. |

## Changed Areas

| Area | Summary |
|---|---|
| `packages/opencode` | New scoped product/installer package exposing setup and product README. |
| `packages/cli/src/setup-stack/*` | Fakeable setup planning/execution, CLI/OpenCode/plugin checks, statuses, failure sanitization, and setup exports. |
| `packages/core/src/registry-store.ts` | Strict registry status API while preserving existing forgiving read behavior. |
| Docs and README files | Root, commands, product, CLI, core, and plugin docs now point primary users to `npx @multi-profile-provider/opencode setup` and clarify lower-level/direct install roles. |
| Tests | Installer CLI, registry status, setup orchestration, docs positioning, and English copy guardrails cover the change scope. |

## Verification Summary

| Check | Result |
|---|---|
| Tasks complete | ✅ 20/20 original tasks complete plus 2/2 verification-fix follow-ups complete |
| Tests | ✅ `npm test` passed: 19 files / 78 tests |
| Typecheck | ✅ `npm run typecheck` passed |
| Coverage | ✅ 85.22% statements overall; changed source average approximately 90.03% |
| Lint | ⚠️ Blocked because `eslint` is not installed/resolvable |
| Build | Not run by instruction |
| Publish / push / commit | Not performed by instruction |

## Final Warnings

1. `npm run lint` is blocked because `eslint` is not installed/resolvable in the workspace.
2. Plugin idempotency is partially proven: setup always runs/refreshes `opencode plugin -g multi-profile-provider-opencode-plugin@latest`; no test proves already-installed plugin detection as skipped/verified.
3. Direct real-spawn/main branches are intentionally low coverage because tests keep external npm/OpenCode commands fakeable.

## Remaining Follow-ups Before Release

- Resolve or explicitly accept the lint blocker by adding/configuring `eslint` or changing the lint script/dependency.
- Commit the archived SDD artifacts and implementation changes only after review of the working tree.
- Push to GitHub only after explicit approval.
- Complete the npm publish checklist only after explicit approval, including package/version confirmation for `@multi-profile-provider/opencode` and related packages.
- Decide whether to detect an already-installed OpenCode plugin before install/refresh, or document the current OpenCode plugin command as the idempotent install-or-refresh operation.

## Archive Verification Checklist

- [x] Main spec created at `openspec/specs/opencode-stack-setup/spec.md`.
- [x] Archive report written before moving the change folder.
- [x] Verification report has no CRITICAL issues.
- [x] Final verdict preserved as PASS WITH WARNINGS.
- [x] No npm publish, GitHub push, git commit, or build was performed during archive.
