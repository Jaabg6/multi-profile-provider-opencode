import path from "node:path";
export function resolveUninstallPaths(input) {
    const { platform, env, cwd, homedir } = input;
    const home = env.HOME ?? env.USERPROFILE ?? homedir;
    if (!home) {
        throw new Error("Unable to resolve HOME/USERPROFILE for uninstall-stack path resolution.");
    }
    const configRoots = [path.join(cwd, ".opencode"), path.join(home, ".config", "opencode")];
    if (platform === "win32") {
        const appData = env.APPDATA ?? path.join(home, "AppData", "Roaming");
        const localAppData = env.LOCALAPPDATA ?? appData ?? path.join(home, "AppData", "Local");
        return {
            configRoots: [...configRoots, path.join(appData, "opencode")],
            stateRoots: [path.join(localAppData, "opencode"), path.join(appData, "opencode")],
            dataRoots: [path.join(localAppData, "opencode"), path.join(appData, "opencode")],
            cacheRoots: [
                path.join(localAppData, "opencode", "cache"),
                path.join(localAppData, "opencode"),
                path.join(appData, "opencode")
            ],
            profileRoots: [env.OPENCODE_PROFILE_HOME ?? path.join(home, ".opencode-profiles")]
        };
    }
    const xdgConfig = env.XDG_CONFIG_HOME ?? path.join(home, ".config");
    const xdgState = env.XDG_STATE_HOME ?? path.join(home, ".local", "state");
    const xdgData = env.XDG_DATA_HOME ?? path.join(home, ".local", "share");
    const xdgCache = env.XDG_CACHE_HOME ?? path.join(home, ".cache");
    return {
        configRoots: [...configRoots, path.join(xdgConfig, "opencode")],
        stateRoots: [path.join(xdgState, "opencode")],
        dataRoots: [path.join(xdgData, "opencode")],
        cacheRoots: [path.join(xdgCache, "opencode")],
        profileRoots: [env.OPENCODE_PROFILE_HOME ?? path.join(home, ".opencode-profiles")]
    };
}
//# sourceMappingURL=paths.js.map