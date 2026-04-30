import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

type CommandExpectation = {
  file: string;
  requiredTool: string;
  requiredCli: string;
};

const commands: CommandExpectation[] = [
  {
    file: ".opencode/commands/profile-status.md",
    requiredTool: "profile_status",
    requiredCli: "mpp status"
  },
  {
    file: ".opencode/commands/profile-list.md",
    requiredTool: "profile_list",
    requiredCli: "mpp list"
  },
  {
    file: ".opencode/commands/profile-create.md",
    requiredTool: "profile_create",
    requiredCli: "mpp create <id> <label>"
  },
  {
    file: ".opencode/commands/profile-select.md",
    requiredTool: "profile_select",
    requiredCli: "mpp select <id>"
  },
  {
    file: ".opencode/commands/profile-delete.md",
    requiredTool: "profile_delete",
    requiredCli: "mpp delete <id>"
  }
];

describe("OpenCode slash command execution instructions", () => {
  it("contains deterministic execute-now workflow text with tool and CLI fallback", async () => {
    for (const command of commands) {
      const content = await fs.readFile(command.file, "utf8");
      expect(content).toContain("This slash command is an agent workflow prompt.");
      expect(content).toContain("Execute the operation now.");
      expect(content).toContain("DO NOT only paste/restate this template.");
      expect(content).toContain("Do not read, copy, parse, or migrate credential/auth files.");
      expect(content).toContain(command.requiredTool);
      expect(content).toContain(command.requiredCli);
      expect(content).toContain("node packages/cli/dist/index.js");
    }
  });
});
