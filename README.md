# Multi Profile Provider

OpenCode provider profile switcher plugin and core library for isolated profile data roots.

## OpenCode Plugin Install

- `opencode plugin @multi-profile-provider/opencode-plugin`

## Plugin Tools

- `profile_create { "id": "p1", "label": "Profile One" }`
- `profile_list {}`
- `profile_select { "id": "p1" }`
- `profile_rename { "id": "p1", "label": "Primary" }`
- `profile_delete { "id": "p1" }`
- `profile_status {}`

All plugin tools return a JSON string with this shape:

`{"ok":true|false,"message":"English message","data":{...optional}}`

After selecting a profile, relaunch OpenCode manually:

`Profile changed. Restart OpenCode to use this profile.`

## CLI Fallback

If plugin tools are unavailable in a given environment, run the CLI package commands (`packages/cli`) for equivalent profile operations.

## Development

- `npm install`
- `npm run test`
- `npm run typecheck`

## Security Notes

- Metadata-only profile management.
- No credential file parsing/copying/introspection in MVP.
- Canonical path boundary enforcement under profile base root.
