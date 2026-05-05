# @multi-profile-provider/cli

Lower-level CLI and launcher package for Multi Profile Provider runtime isolation.

Most OpenCode users should start with the product setup flow instead:

```bash
npx @multi-profile-provider/opencode setup
```

Use this package directly when you specifically need the CLI launchers or command surface without the full product setup wrapper.

## Direct-install path

```bash
npm install -g @multi-profile-provider/cli@latest
opencode-mpp
# or
mpp run
```

Primary commands: `mpp run`, `opencode-mpp`, `mpp status`, `mpp profile`, and `mpp uninstall-stack`.

See the repository root `README.md` and `docs/commands.md` for complete setup, command semantics, and release documentation.
