# Security Model (MVP)

- The normal runtime model is plugin-owned provider auth: profile tools inside OpenCode select the active profile, and auth/header hooks use that selection for subsequent provider requests.
- Switching affects the next provider request after selection. In-flight requests are not guaranteed to change credentials mid-request.
- Profile metadata, account records, and tokens are stored in plugin/core-managed user data storage with best-effort private directory/file permissions and atomic writes.
- Status, logs, errors, migration output, and uninstall output must redact raw tokens, API keys, refresh secrets, and provider credentials.
- Install through the OpenCode plugin path: `opencode plugin -g multi-profile-provider-opencode-plugin`, or run `npx @multi-profile-provider/opencode setup` as a setup/update helper.
- Update preserves existing profiles, active selection, account records, tokens, and plugin configuration.
- Uninstall removes plugin config/cache and requires an explicit choice to preserve or purge profile data.
- Legacy launcher artifacts may be detected for migration or cleanup, but they are not used for normal profile switching.
- Profile deletion is consent-based: deleting or purging profile data must not happen implicitly during setup, update, or default uninstall.
