# multi-profile-provider-opencode-plugin

Compatibility OpenCode plugin package for environments where scoped npm plugin installs can fail.

Most users should let the product setup flow install or verify this package:

```bash
npx @multi-profile-provider/opencode setup
```

## Direct-install path

Use direct install only when you intentionally manage the OpenCode plugin yourself.

Recommended global install:

```bash
opencode plugin -g multi-profile-provider-opencode-plugin@latest
```

Local project-scoped install is still available when intentionally needed:

```bash
opencode plugin multi-profile-provider-opencode-plugin@latest
```

This package ships its own server (`.`) and TUI (`./tui`) OpenCode entrypoints to avoid nested dependency/subpath resolution issues in plugin loaders.
