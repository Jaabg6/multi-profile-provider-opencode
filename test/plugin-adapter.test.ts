import { describe, expect, it } from "vitest";
import { MultiProfileProviderPlugin } from "@multi-profile-provider/opencode-plugin";
import { withTempProfileHome } from "./utils/temp-env.js";

type RegisteredTool = {
  id: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
};

async function registerTools(): Promise<Map<string, RegisteredTool>> {
  const plugin = await MultiProfileProviderPlugin({ client: { app: { log: async () => undefined } } } as never);
  const tools = new Map<string, RegisteredTool>();
  await plugin["tool.register"]?.(
    {},
    {
      register: async (tool: RegisteredTool) => {
        tools.set(tool.id, tool);
      },
      registerHTTP: async () => undefined
    }
  );
  return tools;
}

describe("opencode plugin adapter", () => {
  it("exposes official plugin function with six profile tools", async () => {
    await withTempProfileHome(async () => {
      const tools = await registerTools();
      expect([...tools.keys()].sort()).toEqual([
        "profile_create",
        "profile_delete",
        "profile_list",
        "profile_rename",
        "profile_select",
        "profile_status"
      ]);
    });
  });

  it("returns english JSON results and manual relaunch guidance on select", async () => {
    await withTempProfileHome(async () => {
      const tools = await registerTools();
      const createdOne = JSON.parse(await tools.get("profile_create")!.execute({ id: "p1", label: "Profile One" }));
      const createdTwo = JSON.parse(await tools.get("profile_create")!.execute({ id: "p2", label: "Profile Two" }));
      const selected = JSON.parse(await tools.get("profile_select")!.execute({ id: "p2" }));

      expect(createdOne.ok).toBe(true);
      expect(createdTwo.ok).toBe(true);
      expect(selected).toEqual({
        ok: true,
        message: `Profile changed. Restart OpenCode with OPENCODE_HOME=${createdTwo.data.dataRoot} to isolate provider auth.`
      });
    });
  });

  it("maps list/rename/delete/status to core service behavior", async () => {
    await withTempProfileHome(async () => {
      const tools = await registerTools();
      await tools.get("profile_create")!.execute({ id: "p1", label: "Profile One" });
      await tools.get("profile_create")!.execute({ id: "p2", label: "Profile Two" });

      const renamed = JSON.parse(await tools.get("profile_rename")!.execute({ id: "p2", label: "Renamed Profile" }));
      const listed = JSON.parse(await tools.get("profile_list")!.execute({}));
      const status = JSON.parse(await tools.get("profile_status")!.execute({}));
      const deleted = JSON.parse(await tools.get("profile_delete")!.execute({ id: "p2" }));

      expect(renamed).toEqual({ ok: true, message: "Profile renamed." });
      expect(listed.ok).toBe(true);
      expect(Array.isArray(listed.data)).toBe(true);
      expect(status.ok).toBe(true);
      expect(Array.isArray(status.data.profiles)).toBe(true);
      expect(status.data.runtimeBinding.env.OPENCODE_HOME).toBe(status.data.runtimeBinding.dataRoot);
      expect(status.data.runtimeBinding.env.XDG_CONFIG_HOME).toBeUndefined();
      expect(deleted).toEqual({ ok: true, message: "Profile deleted." });
    });
  });

  it("keeps CLI fallback path available for guidance", async () => {
    const tools = await registerTools();
    const selected = JSON.parse(await tools.get("profile_select")!.execute({ id: "missing" }));
    expect(selected).toEqual({ ok: false, message: "Profile not found." });
  });
});
