import type { UninstallStackArgs } from "./types.js";

export function parseUninstallStackArgs(argv: string[]): UninstallStackArgs {
  const parsed: UninstallStackArgs = {
    mode: "plan",
    apply: false,
    full: false,
    stopOpencode: false,
    removeProfiles: false,
    cleanNpmCache: false,
    verboseReport: false,
    pluginNames: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--apply":
        parsed.apply = true;
        parsed.mode = "apply";
        break;
      case "--full":
        parsed.full = true;
        parsed.apply = true;
        parsed.mode = "apply";
        parsed.stopOpencode = true;
        parsed.removeProfiles = true;
        parsed.cleanNpmCache = true;
        parsed.verboseReport = true;
        break;
      case "--stop-opencode":
        parsed.stopOpencode = true;
        break;
      case "--remove-profiles":
        parsed.removeProfiles = true;
        break;
      case "--clean-npm-cache":
        parsed.cleanNpmCache = true;
        break;
      case "--verbose-report":
        parsed.verboseReport = true;
        break;
      case "--plugin-name": {
        const name = argv[i + 1];
        if (name) {
          parsed.pluginNames.push(name);
          i += 1;
        }
        break;
      }
      case "--dry-run":
      case "--plan":
        parsed.apply = false;
        parsed.mode = "plan";
        break;
      default:
        break;
    }
  }

  return parsed;
}
