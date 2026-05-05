# Proposal: One Command Stack Setup

## Intent

Current onboarding requires users to install the CLI and OpenCode plugin separately, then still fails to be useful if no profile exists. Provide a polished one-command setup path, recommended as `npx @multi-profile-provider/opencode setup`, that installs/verifies the stack and creates a safe default profile.

## Scope

### In Scope
- New scoped product/installer package `@multi-profile-provider/opencode` exposing `setup`; mention `multi-profile-provider-opencode` only as a possible alternate package name.
- Idempotent setup orchestration: verify/install CLI and plugin paths, validate OpenCode availability, and print next launch guidance.
- Default profile creation: create `main` / `Main` only when no non-deleted profiles exist; never overwrite or duplicate profiles.
- High-quality README for the new package plus README updates for legacy/direct-install packages explaining preferred setup flow.

### Out of Scope
- npm `postinstall` global side effects as the primary flow.
- Destructive profile migration, registry repair, secret/API key handling, build execution, or publish execution.

## Capabilities

### New Capabilities
- `opencode-stack-setup`: one-command setup, verification, idempotency, default profile creation, and onboarding docs.

### Modified Capabilities
- None; no existing OpenSpec specs are present.

## Approach

Implement setup behavior in reusable CLI/core orchestration, then expose it through the new `@multi-profile-provider/opencode` package bin so `npx @multi-profile-provider/opencode setup` is the primary UX. Reuse existing uninstall-stack process helpers for cross-platform command execution and plugin detection. Treat setup as explicit plan/apply-style work: check OpenCode, ensure plugin install, ensure CLI launcher availability or explain one-shot limits, create `Main` only for an empty registry, then show `opencode-mpp` / `mpp run` guidance.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/opencode` | New | Scoped installer/product package and README. |
| `packages/cli/src/**` | Modified | Reusable setup orchestration and command routing. |
| `packages/core/src/service.ts` | Modified | Safe empty-registry default profile support if needed. |
| `README.md`, `docs/commands.md`, package READMEs | Modified | Preferred setup flow and legacy/direct-install guidance. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Package naming/export conflict | Med | Resolve in spec/design before implementation. |
| OpenCode plugin validation differs by platform/version | Med | Test detection and `.cmd` spawning; document prerequisites. |
| Work exceeds 400-line review budget | High | Use chained slices: package shell, setup behavior/tests, docs. |

## Rollback Plan

Remove the new package and setup command/docs; leave existing CLI/plugin install flow untouched. Profile creation remains non-destructive and skipped when profiles already exist.

## Dependencies

- OpenCode CLI/plugin command behavior must be revalidated.
- npm package scope/name and publish permissions need confirmation.

## Success Criteria

- [ ] `npx @multi-profile-provider/opencode setup` is the documented primary command.
- [ ] Setup is idempotent and creates `Main` only for empty profile registries.
- [ ] New and legacy READMEs clearly explain preferred and direct/deprecated paths.
