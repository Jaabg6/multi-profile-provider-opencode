# OpenCode API Runtime Log

This runtime log records local validation notes for the OpenCode plugin adapter.

## Observations

- Multi Profile Provider keeps profile operations behind explicit tools and CLI fallback commands.
- The plugin adapter does not depend on legacy `registerCommand`, `notify`, or restart APIs.
- OpenCode must be relaunched through `mpp run` or `opencode-mpp` after profile selection to apply runtime isolation.
