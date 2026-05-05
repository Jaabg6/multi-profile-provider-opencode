# OpenCode Stack Setup Specification

## Purpose

Define the product installer flow that makes `npx @multi-profile-provider/opencode setup` the safe, explicit onboarding path for the CLI, OpenCode plugin, and initial profile registry.

## Requirements

### Requirement: Product setup command

The installer package MUST expose `setup` through `npx @multi-profile-provider/opencode setup` and SHOULD show clear help when invoked without a supported subcommand.

#### Scenario: Primary setup invocation

- GIVEN the installer package is executed through npx
- WHEN the user runs `npx @multi-profile-provider/opencode setup`
- THEN setup orchestration MUST start without requiring package-specific postinstall side effects
- AND output MUST identify the product and planned setup checks

### Requirement: Setup orchestration output

Setup MUST run explicit checks for OpenCode, CLI availability, plugin installation, profile registry initialization, and next commands, and MUST report each step as done, skipped, or failed.

#### Scenario: Successful setup summary

- GIVEN all required tools can be verified or installed
- WHEN setup finishes
- THEN output MUST include success status for each setup area
- AND MUST show launch guidance mentioning `opencode-mpp` and `mpp run`

### Requirement: OpenCode prerequisite

Setup MUST verify that the OpenCode CLI is available before attempting plugin installation and MUST NOT hide missing-prerequisite failures.

#### Scenario: OpenCode is missing

- GIVEN OpenCode is not available on PATH
- WHEN setup runs
- THEN setup MUST fail before plugin installation
- AND output MUST explain how to install or expose OpenCode

### Requirement: CLI availability and bins

Setup MUST verify or install the CLI through explicit user-invoked setup behavior, and the CLI package MUST expose `mpp` and `opencode-mpp` bins when available.

#### Scenario: CLI unavailable

- GIVEN the CLI launcher cannot be found or installed
- WHEN setup runs
- THEN setup MUST report the npm/global install failure
- AND MUST NOT claim `mpp` or `opencode-mpp` are ready

### Requirement: Plugin installation and verification

Setup MUST install or verify the OpenCode plugin through the OpenCode CLI and MUST surface plugin command failures.

#### Scenario: Plugin install fails

- GIVEN the OpenCode plugin install command returns failure
- WHEN setup runs
- THEN setup MUST report plugin installation as failed
- AND MUST include enough command/output context for remediation without exposing secrets

### Requirement: Profile registry initialization

Setup MUST create default profile id `main` with display name `Main` only when no non-deleted profiles exist.

#### Scenario: Empty registry gets Main

- GIVEN the profile registry exists or can be initialized and has no non-deleted profiles
- WHEN setup runs
- THEN profile `main` named `Main` MUST exist
- AND no API keys or secrets MUST be generated

#### Scenario: Existing profiles are preserved

- GIVEN at least one non-deleted profile exists
- WHEN setup runs
- THEN setup MUST NOT create, overwrite, rename, or delete any profile

### Requirement: Idempotency and no overwrite

Repeated setup runs MUST be safe: existing valid CLI, plugin, config, and registry state MUST be detected and skipped rather than overwritten.

#### Scenario: Re-running setup

- GIVEN setup completed successfully before
- WHEN setup runs again
- THEN all existing valid setup artifacts MUST be preserved
- AND output MUST mark already-ready steps as skipped or verified

### Requirement: Malformed or inaccessible local state

Setup MUST fail safely on malformed registry/config files or permission errors and MUST NOT rewrite them unless a future explicit repair command is designed.

#### Scenario: Invalid registry or permissions

- GIVEN existing registry/config content is malformed or cannot be written
- WHEN setup runs
- THEN setup MUST stop with a clear error
- AND MUST leave existing files unchanged

### Requirement: Documentation positioning

The new package README MUST be polished product documentation for setup, prerequisites, verification, troubleshooting, and next steps; older/direct package READMEs SHOULD point to the setup flow and explain their lower-level, legacy, or direct-install role.

#### Scenario: User reads package docs

- GIVEN a user opens the new or legacy package README
- WHEN they look for installation guidance
- THEN the new README MUST recommend `npx @multi-profile-provider/opencode setup`
- AND legacy READMEs SHOULD clarify when direct installation remains appropriate

### Requirement: Non-goals

Setup MUST NOT perform destructive migration, automatic secret/API-key generation, publish/build execution, or postinstall global mutation as the primary install behavior.

#### Scenario: Setup side-effect boundaries

- GIVEN setup runs on any supported platform
- WHEN setup completes or fails
- THEN it MUST NOT run build/publish flows or mutate global state from package postinstall
- AND it MUST NOT delete or migrate existing user data

## Review Workload Forecast

400-line budget risk: High. Chained PRs recommended: Yes. Suggested slices: installer package shell, setup orchestration/tests, documentation updates.
