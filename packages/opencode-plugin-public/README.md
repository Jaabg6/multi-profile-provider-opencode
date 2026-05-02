# multi-profile-provider-opencode-plugin

Compatibility npm package for OpenCode plugin installation in environments where scoped package plugin install can fail.

Recommended global install:

```bash
opencode plugin -g multi-profile-provider-opencode-plugin
```

Local (project-scoped) install is still available when intentionally needed:

```bash
opencode plugin multi-profile-provider-opencode-plugin
```

This package ships its own server (`.`) and TUI (`./tui`) OpenCode entrypoints to avoid nested dependency/subpath resolution issues in plugin loaders.
