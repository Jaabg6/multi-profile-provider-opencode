#!/usr/bin/env node
import { NoopRestartController, ProfileService, RegistryStore, resolveRegistryPath } from "@multi-profile-provider/core";

export async function runCli(argv: string[], write: (message: string) => void = console.log): Promise<void> {
  const [cmd, ...args] = argv;
  const service = new ProfileService(new RegistryStore(resolveRegistryPath()), new NoopRestartController());
  switch (cmd) {
    case "status": {
      const profiles = await service.listProfiles();
      const activeProfile = profiles.find((profile) => profile.active);
      write(`Active profile: ${activeProfile ? `${activeProfile.id} (${activeProfile.label})` : "none"}`);
      write(`Available profiles: ${profiles.length}`);
      break;
    }
    case "create":
      write((await service.createProfile({ id: args[0], label: args[1] })).message);
      break;
    case "list":
      write(JSON.stringify(await service.listProfiles(), null, 2));
      break;
    case "select":
      write((await service.selectProfile(args[0])).message);
      break;
    case "rename":
      write((await service.renameProfile(args[0], args[1])).message);
      break;
    case "delete":
      write((await service.softDeleteProfile(args[0])).message);
      break;
    default:
      write("Commands: status | create <id> <label> | list | select <id> | rename <id> <label> | delete <id>");
  }
}

async function main() {
  await runCli(process.argv.slice(2));
}

void main();
