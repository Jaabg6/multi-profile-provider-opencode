type PluginFactoryContext = Parameters<
  typeof import("../../packages/opencode-plugin/src/index.ts").MultiProfileProviderPlugin
>[0];

async function resolvePluginModule() {
  try {
    return await import("../../packages/opencode-plugin/src/index.ts");
  } catch {
    return await import("../../packages/opencode-plugin/dist/index.js");
  }
}

export async function MultiProfileProviderPlugin(context: PluginFactoryContext) {
  const module = await resolvePluginModule();
  return module.MultiProfileProviderPlugin(context);
}
