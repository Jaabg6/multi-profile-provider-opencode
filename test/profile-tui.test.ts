import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempProfileHome } from "./utils/temp-env.js";

const tuiPath = path.resolve("packages/opencode-plugin/src/tui.tsx");

async function waitForDialogType(read: () => any, type: string): Promise<any> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const current = read();
    if (current?.type === type) return current;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return read();
}

describe("profile tui plugin", () => {
  it("provides a real navigable OpenCode TUI entry", async () => {
    const source = await fs.readFile(tuiPath, "utf8");

    expect(source).toContain("@jsxImportSource @opentui/solid");
    expect(source).toContain("@opencode-ai/plugin/tui");
    expect(source).toContain("api.command.register");
    expect(source).toContain("keybind: \"alt+p,super+p\"");
    expect(source).toContain("slash: { name: \"profile-ui\" }");
    expect(source).toContain("DialogSelect");
    expect(source).toContain("DialogPrompt");
    expect(source).toContain("DialogConfirm");
    expect(source).toContain("DialogAlert");
    expect(source).toContain("Restart OpenCode to apply provider auth isolation");
  });

  it("exports the tui entry path from package metadata", async () => {
    const packageJsonPath = path.resolve("packages/opencode-plugin/package.json");
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as {
      exports?: Record<string, { import?: string; types?: string }>;
    };

    expect(pkg.exports?.["./tui"]?.import).toBe("./dist/tui.js");
    expect(pkg.exports?.["./tui"]?.types).toBe("./dist/tui.d.ts");
  });

  it("exports server+tui dist entrypoints in compatibility package metadata", async () => {
    const packageJsonPath = path.resolve("packages/opencode-plugin-public/package.json");
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as {
      exports?: Record<string, { import?: string; types?: string }>;
    };

    expect(pkg.exports?.["."]?.import).toBe("./dist/index.js");
    expect(pkg.exports?.["."]?.types).toBe("./dist/index.d.ts");
    expect(pkg.exports?.["./tui"]?.import).toBe("./dist/tui.js");
    expect(pkg.exports?.["./tui"]?.types).toBe("./dist/tui.d.ts");
  });

  it("registers interactive command and navigable dialogs", async () => {
    await withTempProfileHome(async () => {
      const mod = await import("../packages/opencode-plugin/src/tui.tsx");
      const plugin = mod.default as { tui: (api: any) => Promise<void> };

      let commandFactory: (() => any[]) | undefined;
      let lastDialog: any;

      const api = {
        command: {
          register: (cb: () => any[]) => {
            commandFactory = cb;
            return () => undefined;
          }
        },
        ui: {
          DialogSelect: (props: any) => ({ type: "DialogSelect", props }),
          DialogPrompt: (props: any) => ({ type: "DialogPrompt", props }),
          DialogConfirm: (props: any) => ({ type: "DialogConfirm", props }),
          DialogAlert: (props: any) => ({ type: "DialogAlert", props }),
          dialog: {
            replace: (render: () => any) => {
              lastDialog = render();
            }
          },
          toast: () => undefined
        }
      };

      await plugin.tui(api);
      const commands = commandFactory?.() ?? [];
      expect(commands).toHaveLength(1);
      expect(commands[0].value).toBe("profile-ui");

      commands[0].onSelect();
      await waitForDialogType(() => lastDialog, "DialogSelect");
      expect(lastDialog.type).toBe("DialogSelect");

      lastDialog.props.onSelect({ value: "create" });
      expect(lastDialog.type).toBe("DialogPrompt");
      lastDialog.props.onConfirm("team-a");
      expect(lastDialog.type).toBe("DialogPrompt");
      lastDialog.props.onConfirm("Team A");

      // Let async create/list refresh finish.
      await waitForDialogType(() => lastDialog, "DialogSelect");
      expect(lastDialog.type).toBe("DialogSelect");

      lastDialog.props.onSelect({ value: "team-a" });
      expect(lastDialog.type).toBe("DialogSelect");
      lastDialog.props.onSelect({ value: "select" });
      await waitForDialogType(() => lastDialog, "DialogAlert");
      expect(lastDialog.type).toBe("DialogAlert");
      lastDialog.props.onConfirm();

      await waitForDialogType(() => lastDialog, "DialogSelect");
      lastDialog.props.onSelect({ value: "__back" });
      await waitForDialogType(() => lastDialog, "DialogSelect");
      expect(lastDialog.type).toBe("DialogSelect");
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });
});
