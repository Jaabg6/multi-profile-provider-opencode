#!/usr/bin/env node
async function main() {
    process.env.MPP_SUPPRESS_MAIN = "1";
    const { runCli } = await import("./index.js");
    await runCli(["run", ...process.argv.slice(2)]);
}
void main();
export {};
//# sourceMappingURL=opencode-mpp.js.map