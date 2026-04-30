#!/usr/bin/env node
import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";
async function main() {
    const [cmd, ...args] = process.argv.slice(2);
    const service = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
    switch (cmd) {
        case "create":
            console.log((await service.createProfile({ id: args[0], label: args[1] })).message);
            break;
        case "list":
            console.log(JSON.stringify(await service.listProfiles(), null, 2));
            break;
        case "select":
            console.log((await service.selectProfile(args[0])).message);
            break;
        case "rename":
            console.log((await service.renameProfile(args[0], args[1])).message);
            break;
        case "delete":
            console.log((await service.softDeleteProfile(args[0])).message);
            break;
        default:
            console.log("Commands: create <id> <label> | list | select <id> | rename <id> <label> | delete <id>");
    }
}
void main();
//# sourceMappingURL=index.js.map