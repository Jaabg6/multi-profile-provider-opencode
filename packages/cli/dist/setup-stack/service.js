import { resolveProfileDataRoot, resolveRegistryPath } from "@multi-profile-provider/core/paths";
import { RegistryStore } from "@multi-profile-provider/core/registry-store";
const defaultPluginPackage = "multi-profile-provider-opencode-plugin@latest";
const stepNames = [
    "OpenCode prerequisite",
    "OpenCode plugin",
    "Profile registry",
    "Next commands"
];
function plannedStep(name) {
    return { name, status: "planned", message: "Pending setup check." };
}
function excerpt(value) {
    return value
        .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, "$1=<redacted>")
        .replace(/(authorization\s*:\s*bearer\s+)\S+/gi, "$1<redacted>")
        .slice(0, 240);
}
function failureDetail(command, args, result) {
    const output = excerpt([result.stderr, result.stdout].filter(Boolean).join("\n"));
    return `${command} ${args.join(" ")} exited ${result.code}${output ? `: ${output}` : ""}`;
}
async function verifyCommand(deps, command, args, options) {
    const result = await deps.spawn(command, args, options);
    if (result.code === 0)
        return undefined;
    return { name: command, status: "failed", message: `${command} is not ready.`, detail: failureDetail(command, args, result) };
}
function registryStore(deps) {
    return deps.createRegistryStore?.() ?? new RegistryStore(resolveRegistryPath(deps.env));
}
function createMainRegistry(env, now) {
    const timestamp = now.toISOString();
    const mainProfile = {
        id: "main",
        label: "Main",
        status: "active",
        dataRoot: resolveProfileDataRoot("main", env),
        createdAt: timestamp,
        updatedAt: timestamp
    };
    return { version: 1, activeProfileId: "main", profiles: [mainProfile] };
}
export async function createSetupPlan(argsInput, _deps) {
    return {
        args: { dryRun: false, ...argsInput },
        steps: stepNames.map(plannedStep)
    };
}
async function checkOpenCode(deps) {
    const failure = await verifyCommand(deps, "opencode", ["--version"]);
    if (failure) {
        return {
            name: "OpenCode prerequisite",
            status: "failed",
            message: "OpenCode executable was not found or did not run.",
            detail: `${failure.detail}. Install OpenCode and make sure 'opencode' is available on PATH.`
        };
    }
    return { name: "OpenCode prerequisite", status: "done", message: "OpenCode is available." };
}
async function ensurePlugin(deps) {
    const packageSpec = deps.env.MPP_OPENCODE_PLUGIN_PACKAGE?.trim() || defaultPluginPackage;
    const args = ["plugin", "-g", packageSpec];
    const result = await deps.spawn("opencode", args);
    if (result.code !== 0) {
        return {
            name: "OpenCode plugin",
            status: "failed",
            message: "OpenCode plugin installation failed.",
            detail: failureDetail("opencode", args, result)
        };
    }
    return { name: "OpenCode plugin", status: "done", message: "OpenCode plugin is installed or refreshed." };
}
async function ensureRegistry(deps) {
    const store = registryStore(deps);
    const status = await store.readStatus();
    if (status.state === "valid-with-profiles") {
        return { name: "Profile registry", status: "skipped", message: "existing profiles preserved" };
    }
    if (status.state === "malformed" || status.state === "unreadable") {
        return {
            name: "Profile registry",
            status: "failed",
            message: `Registry is ${status.state}; setup will not rewrite it automatically.`,
            detail: status.error
        };
    }
    await store.write(createMainRegistry(deps.env, deps.now?.() ?? new Date()));
    return { name: "Profile registry", status: "done", message: "created main/Main" };
}
function nextCommands() {
    return {
        name: "Next commands",
        status: "done",
        message: "Use OpenCode plugin tools to create/select profiles; selected profiles affect subsequent provider requests."
    };
}
function writeStep(deps, step) {
    deps.write(`[${step.status}] ${step.name}: ${step.message}`);
    if (step.detail)
        deps.write(`  ${step.detail}`);
}
export async function executeSetupPlan(plan, deps) {
    deps.write("[plan] Setup checks: OpenCode, plugin, registry, next commands");
    if (plan.args.dryRun) {
        for (const step of plan.steps)
            writeStep(deps, step);
        return { ok: true, steps: plan.steps };
    }
    const completed = [];
    for (const runStep of [checkOpenCode, ensurePlugin, ensureRegistry]) {
        const step = await runStep(deps);
        completed.push(step);
        writeStep(deps, step);
        if (step.status === "failed")
            return { ok: false, steps: completed };
    }
    const finalStep = nextCommands();
    completed.push(finalStep);
    writeStep(deps, finalStep);
    return { ok: true, steps: completed };
}
export async function runSetupStack(args, deps) {
    return executeSetupPlan(await createSetupPlan(args, deps), deps);
}
//# sourceMappingURL=service.js.map
