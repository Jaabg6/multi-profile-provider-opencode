# OpenCode Plugin API Docs Research

- Source URL: https://opencode.ai/docs/plugins
- Page title: Plugins | OpenCode
- Last updated (as shown on page): 2026-04-27
- Accessed date (UTC): 2026-04-29
- Runtime version under test: OpenCode 1.14.29

## Official Claims by Capability

| Capability ID | Section | Claim | Evidence Type |
|---|---|---|---|
| `plugin-load-paths` | Use a plugin → From local files | Project plugins in `.opencode/plugins/`; global plugins in `~/.config/opencode/plugins/`; files auto-load at startup. | doc |
| `plugin-npm-config` | Use a plugin → From npm | `opencode.json` supports `plugin` array with npm package names (including scoped packages). | doc |
| `plugin-install-cache` | Use a plugin → How plugins are installed | npm plugins are installed with Bun at startup and cached in `~/.cache/opencode/node_modules/`. | doc |
| `plugin-cli-install` | CLI help (`opencode plugin --help`) | `opencode plugin <module>` installs plugin and updates config; supports local/global scope flags. | doc/runtime |
| `plugin-export-shape` | Create a plugin → Basic structure | Plugin is a JS/TS module exporting plugin functions that receive context and return hooks. | doc |
| `plugin-ts-type` | Create a plugin → TypeScript support | `Plugin` type can be imported from `@opencode-ai/plugin`. | doc |
| `plugin-events-list` | Create a plugin → Events | Documents event groups and names, including `shell.env`, `tool.execute.before`, `tool.execute.after`, `tui.command.execute`, and `tui.toast.show`. | doc |
| `plugin-command-ux` | Events + Examples | No direct command registration API is documented for plugins; command-like UX appears via hooks/events and custom tools. | doc |
| `plugin-messaging` | Examples → Send notifications / Logging | Messaging surfaces include `tui.toast.show` event hook and `client.app.log()` for structured logs. | doc |
| `plugin-restart` | Full page review | No plugin API for host restart/relaunch is documented in Plugins docs. | doc |
| `plugin-shell-env` | Examples → Inject environment variables + Basic structure | `shell.env` hook can inject env values; `$` Bun shell API is available in plugin context. | doc |
| `plugin-custom-tools` | Examples → Custom tools | Plugins can add custom tools; docs show helper `tool` from `@opencode-ai/plugin`. | doc |

## Notes

1. This research captures claims exactly as documented and defers behavior confirmation to runtime probes.
2. No credential/auth files were inspected for this validation.
3. Runtime command `opencode plugin opencode-wakatime --print-logs --log-level DEBUG` confirmed project-local config updates are written to `.opencode/opencode.json`.
