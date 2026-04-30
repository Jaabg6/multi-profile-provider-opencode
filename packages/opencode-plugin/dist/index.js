import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";
function toSafeMessage(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "Unexpected plugin tool error.";
}
function serializeToolResult(result) {
    return JSON.stringify(result);
}
async function runTool(execute) {
    try {
        return serializeToolResult(await execute());
    }
    catch (error) {
        return serializeToolResult({ ok: false, message: toSafeMessage(error) });
    }
}
export const MultiProfileProviderPlugin = async ({ client }) => {
    const service = new ProfileService(new RegistryStore(resolveRegistryPath(process.env)), new NoopRestartController(), process.env);
    await client?.app?.log?.({
        body: {
            service: "multi-profile-provider-plugin",
            level: "info",
            message: "Plugin initialized with tool-first profile operations."
        }
    });
    return {
        "tool.register": async (_input, output) => {
            output.register({
                id: "profile_create",
                description: "Create profile metadata and reserve isolated data root.",
                parameters: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Unique profile id." },
                        label: { type: "string", description: "Display label." }
                    }
                },
                execute: async (args) => runTool(async () => service.createProfile(args))
            });
            output.register({
                id: "profile_list",
                description: "List available non-deleted profiles.",
                parameters: { type: "object", properties: {} },
                execute: async () => runTool(async () => ({
                    ok: true,
                    message: "Profiles listed.",
                    data: await service.listProfiles()
                }))
            });
            output.register({
                id: "profile_select",
                description: "Select the active profile and return relaunch guidance with isolated runtime root.",
                parameters: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Profile id to activate." }
                    }
                },
                execute: async (args) => runTool(async () => {
                    const result = await service.selectProfile(args.id);
                    const binding = result.ok ? await service.resolveRuntimeBinding(args.id) : undefined;
                    return {
                        ok: result.ok,
                        message: result.ok
                            ? `Profile changed. Restart OpenCode with OPENCODE_HOME=${binding?.dataRoot ?? "<profile-data-root>"} to isolate provider auth.`
                            : result.message
                    };
                })
            });
            output.register({
                id: "profile_rename",
                description: "Rename an existing profile label.",
                parameters: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Profile id." },
                        label: { type: "string", description: "Updated display label." }
                    }
                },
                execute: async (args) => runTool(async () => {
                    const result = await service.renameProfile(args.id, args.label);
                    return { ok: result.ok, message: result.message };
                })
            });
            output.register({
                id: "profile_delete",
                description: "Soft-delete a non-active profile.",
                parameters: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Profile id." }
                    }
                },
                execute: async (args) => runTool(async () => {
                    const result = await service.softDeleteProfile(args.id);
                    return { ok: result.ok, message: result.message };
                })
            });
            output.register({
                id: "profile_status",
                description: "Return active profile and current profile list.",
                parameters: { type: "object", properties: {} },
                execute: async () => runTool(async () => {
                    const profiles = await service.listProfiles();
                    return {
                        ok: true,
                        message: "Profile status loaded.",
                        data: {
                            activeProfile: profiles.find((profile) => profile.active),
                            profiles,
                            runtimeBinding: await service.resolveRuntimeBinding()
                        }
                    };
                })
            });
        }
    };
};
//# sourceMappingURL=index.js.map