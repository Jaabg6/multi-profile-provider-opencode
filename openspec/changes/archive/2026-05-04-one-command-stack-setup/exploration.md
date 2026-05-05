## Exploration: one-command-stack-setup

### Current State
The monorepo publishes separate packages for the core registry service, CLI/launcher, OpenCode plugin adapter, and an unscoped public plugin compatibility package. The CLI package `@multi-profile-provider/cli` currently exposes `mpp` and `opencode-mpp` binaries; the plugin packages expose OpenCode plugin modules but no binary.

Installation is documented as a two-step flow: `npm install -g @multi-profile-provider/cli@latest`, then `opencode plugin -g multi-profile-provider-opencode-plugin@latest`. The docs also mention `npx @multi-profile-provider/cli status` as a one-shot CLI option after publication. There is no current `setup` command.

Profiles are stored in `~/.opencode-profiles/registry.json` unless `OPENCODE_PROFILE_HOME` is set. Creating the first profile makes it active; later profiles are inactive until selected. Each profile reserves a data root at `<profile-home>/<profile-id>/data`, and runtime launch currently injects `XDG_DATA_HOME`, `OPENCODE_PROFILE_ID`, and `OPENCODE_PROFILE_DATA_ROOT` only.

A default `Main` profile can be created safely if and only if there are no non-deleted profiles. `ProfileService.createProfile({ id: "main", label: "Main" })` would create the root and make it active without overwriting profile data, but it will throw on duplicate active profile ID/label and should not run when profiles already exist.

### Affected Areas
- `packages/cli/package.json` — best current package for exposing a setup command because it already owns `mpp`/`opencode-mpp` binaries and runtime/profile orchestration.
- `packages/cli/src/index.ts` — command router where `setup` would be added if implemented in the CLI.
- `packages/core/src/service.ts` — profile creation/listing behavior enables safe default profile creation when registry is empty.
- `packages/core/src/paths.ts` — profile registry/data root path rules and `OPENCODE_PROFILE_HOME` override.
- `packages/cli/src/uninstall-stack/*` — reusable patterns for cross-platform command spawning, OpenCode config path discovery, plugin identity matching, and safe plan/apply behavior.
- `README.md`, `docs/commands.md`, `packages/opencode-plugin-public/README.md` — installation docs currently describe separate CLI and plugin installation.
- `packages/opencode-plugin-public/package.json` — existing unscoped npm package name users install into OpenCode; no bin today.

### Approaches
1. **Add `mpp setup` to `@multi-profile-provider/cli`** — users run `npx @multi-profile-provider/cli setup` or globally installed `mpp setup`.
   - Pros: Lowest architectural friction; reuses current CLI bin, core service, spawn helpers, and uninstall safety patterns.
   - Cons: Does not exactly match the preferred `npx multi-profile-provider-opencode setup` spelling unless a separate package or alias is added.
   - Effort: Medium

2. **Create/rename an unscoped setup wrapper package** — publish a package such as `multi-profile-provider-opencode` with a bin that delegates to setup logic.
   - Pros: Best user-facing command shape: `npx multi-profile-provider-opencode setup`; can make one onboarding package install/ensure the rest.
   - Cons: New package naming/publishing surface; must avoid confusion with `multi-profile-provider-opencode-plugin`; wrapper still depends on CLI/core setup implementation.
   - Effort: Medium/High

3. **Add a bin to the existing public plugin package** — users run `npx multi-profile-provider-opencode-plugin setup`.
   - Pros: Uses an already-published/intended unscoped package name and keeps OpenCode plugin installation identity consistent.
   - Cons: Conceptually mixes plugin module and installer CLI; command name includes `plugin`, which is less ideal for whole-stack setup.
   - Effort: Medium

4. **Use npm `postinstall` to auto-configure** — installing one package performs OpenCode/plugin/profile setup automatically.
   - Pros: Fewest explicit user actions after install.
   - Cons: High side-effect and trust risk; poor fit for `npx`; harder to make idempotent, debuggable, and consent-based. This should remain avoided as the default path.
   - Effort: Medium

### Recommendation
Implement setup logic in the CLI first (`mpp setup`) and optionally expose a thin unscoped npx wrapper package (`multi-profile-provider-opencode`) for the exact preferred UX. The setup should be explicit, idempotent, and plan/apply inspired: verify `opencode` is available, run `opencode plugin -g multi-profile-provider-opencode-plugin@latest` only when needed or when `--force` is passed, ensure the profile registry path exists, create `main` / `Main` only when no non-deleted profiles exist, and print next-step launch guidance (`opencode-mpp` or `mpp run`).

### Risks
- `npx @multi-profile-provider/cli setup` does not globally install `mpp`/`opencode-mpp`; if setup promises persistent launchers, it must explicitly run `npm install -g @multi-profile-provider/cli` or clearly document one-shot limits.
- `npx multi-profile-provider-opencode setup` requires a package name that does not currently exist in this repo; root `multi-profile-provider` is private and not suitable as-is.
- Global plugin install depends on `opencode plugin -g`; availability, flags, and config paths are external OpenCode behavior and should be revalidated before implementation.
- Windows requires special handling for `.cmd` execution; existing CLI helpers already solve part of this for child process spawning.
- Setup must not mutate `~/.opencode-profiles/registry.json` when existing profiles are present, and must handle malformed registry reads carefully because `RegistryStore.read()` currently falls back to an empty registry on any read/parse error.
- Documentation currently has an inconsistency: `docs/security.md` says multiple XDG roots are bound, while runtime code/tests show only `XDG_DATA_HOME` is injected.

### Ready for Proposal
Yes. Carry forward the preferred requirement as an explicit setup command with no npm `postinstall` side effects, idempotent profile creation, platform-aware OpenCode/npm command execution, and a decision point on whether the public npx entrypoint is `@multi-profile-provider/cli`, a new `multi-profile-provider-opencode` wrapper, or the existing `multi-profile-provider-opencode-plugin` package.
