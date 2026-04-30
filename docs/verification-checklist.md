# Verification Checklist

| Requirement | Test Coverage |
|---|---|
| Create Profile | `test/profile-service.test.ts` create/list test + `test/plugin-adapter.test.ts` tool create |
| List Profiles | `test/profile-service.test.ts` create/list test + `test/plugin-adapter.test.ts` tool list |
| Select Active Profile | `test/profile-service.test.ts` select test + `test/plugin-adapter.test.ts` tool select |
| Restart supported | Non-goal: no official restart API; manual relaunch guidance only |
| Restart fallback | `test/profile-service.test.ts` select fallback + `test/plugin-adapter.test.ts` |
| Delete protection | `test/profile-service.test.ts` delete protection test |
| Rename | `test/profile-service.test.ts` rename test |
| Isolated roots | `test/profile-service.test.ts` + `paths.ts` canonicalized root generation |
| No credential introspection | Architectural guardrail in core modules (no credential file APIs used) |
| English-only content | `test/english-copy-validation.test.ts` |

## OpenCode API Validation Gate

| Validation Item | Evidence | Status |
|---|---|---|
| Official docs citations captured with URL/date/version | `docs/opencode-api-validation/docs-research.md` | PASS |
| Runtime version captured | `docs/opencode-api-validation/runtime-log.md` (`1.14.29`) | PASS |
| Official plugin install/config mechanism validated | `opencode plugin <module>` + `.opencode/opencode.json` evidence in `runtime-log.md`; prior apply evidence topic `sdd/validate-opencode-plugin-api/apply-progress` | PASS |
| Evidence matrix schema fields populated | `docs/opencode-api-validation/evidence-matrix.json` | PASS |
| Adapter assumptions mapped to evidence rows | `evidence-matrix.json` (`adapter-assumption-*`) | PASS |
| Command registration assumption removed from production adapter | `packages/opencode-plugin/src/index.ts`, `test/opencode-api-evidence-matrix.test.ts` | PASS |
| notify assumption removed from production adapter | `packages/opencode-plugin/src/index.ts`, `test/opencode-api-evidence-matrix.test.ts` | PASS |
| restart API assumption removed from production adapter | `packages/opencode-plugin/src/index.ts`, `test/opencode-api-evidence-matrix.test.ts` | PASS |
| Decision gate written | `docs/opencode-api-followup.md` | PASS (`REDESIGN_REQUIRED`) |

Apply readiness for plugin adapter redesign: **READY** (tool-first adapter implemented against documented APIs; optional hook capture can continue without blocking core profile tool flows).

## Latest Local Verification Run

- `npm run typecheck` — PASS
- `npm run test` — PASS (6 files, 20 tests)
