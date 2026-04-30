/** @jsxImportSource @opentui/solid */

import {
  NoopRestartController,
  ProfileService,
  RegistryStore,
  type ProfileView,
  resolveRegistryPath
} from "@multi-profile-provider/core";
import type { TuiDialogSelectOption, TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";

const id = "multi-profile-provider";

function createService(): ProfileService {
  return new ProfileService(
    new RegistryStore(resolveRegistryPath(process.env)),
    new NoopRestartController(),
    process.env
  );
}

const tui: TuiPlugin = async (api) => {
  const service = createService();

  const openMainMenu = async (): Promise<void> => {
    const profiles = await service.listProfiles();
    const active = profiles.find((item) => item.active);

    const options: TuiDialogSelectOption<string>[] = [
      {
        title: "Profiles",
        value: "profiles",
        description: `Manage profiles (${profiles.length})${active ? ` · Active: ${active.id}` : ""}`
      },
      { title: "Create profile", value: "create", description: "Create profile metadata." },
      { title: "Show status", value: "status", description: "Show active profile and runtime path." },
      {
        title: "Command fallback",
        value: "fallback",
        description: "Use deterministic slash commands if needed."
      }
    ];

    api.ui.dialog.replace(() =>
      api.ui.DialogSelect({
        title: "Multi Profile Provider",
        options,
        onSelect: (selected) => {
          if (selected.value === "profiles") {
            void openProfileList();
            return;
          }
          if (selected.value === "create") {
            void promptCreateProfile();
            return;
          }
          if (selected.value === "status") {
            void showStatus();
            return;
          }
          showFallbackHelp();
        }
      })
    );
  };

  const showFallbackHelp = (): void => {
    api.ui.dialog.replace(() =>
      api.ui.DialogAlert({
        title: "Fallback commands",
        message: [
          "Use: /profile-create <id> <label>",
          "Use: /profile-select <id>",
          "Use: /profile-delete <id>",
          "Use: /profile-status"
        ].join("\n"),
        onConfirm: () => void openMainMenu()
      })
    );
  };

  const showStatus = async (): Promise<void> => {
    const profiles = await service.listProfiles();
    const active = profiles.find((item) => item.active);
    const binding = await service.resolveRuntimeBinding(active?.id);

    api.ui.dialog.replace(() =>
      api.ui.DialogAlert({
        title: "Profile status",
        message: [
          `Active profile: ${active ? `${active.id} (${active.label})` : "none"}`,
          `Profiles: ${profiles.length}`,
          `Next OPENCODE_HOME: ${binding?.dataRoot ?? "<unavailable>"}`,
          "Restart OpenCode to apply provider auth isolation."
        ].join("\n"),
        onConfirm: () => void openMainMenu()
      })
    );
  };

  const promptCreateProfile = (): void => {
    api.ui.dialog.replace(() =>
      api.ui.DialogPrompt({
        title: "Create profile",
        placeholder: "profile-id",
        onConfirm: (rawId) => {
          const profileId = rawId.trim();
          if (!profileId) {
            api.ui.toast({ variant: "error", message: "Profile id is required." });
            return;
          }

          api.ui.dialog.replace(() =>
            api.ui.DialogPrompt({
              title: "Profile label",
              placeholder: "Human-readable label",
              onConfirm: (rawLabel) => {
                void (async () => {
                  const result = await service.createProfile({ id: profileId, label: rawLabel.trim() || profileId });
                  api.ui.toast({
                    variant: result.ok ? "success" : "error",
                    message: result.message
                  });
                  await openProfileList();
                })();
              },
              onCancel: () => void openMainMenu()
            })
          );
        },
        onCancel: () => void openMainMenu()
      })
    );
  };

  const openProfileList = async (): Promise<void> => {
    const profiles = await service.listProfiles();
    const options: TuiDialogSelectOption<string>[] = profiles.map((profile) => ({
      title: `${profile.active ? "●" : "○"} ${profile.label}`,
      value: profile.id,
      description: `${profile.id}${profile.active ? " · active" : ""}`
    }));

    options.push({ title: "+ Create profile", value: "__create" });
    options.push({ title: "← Back", value: "__back" });

    api.ui.dialog.replace(() =>
      api.ui.DialogSelect({
        title: "Profiles",
        options,
        onSelect: (selected) => {
          if (selected.value === "__back") {
            void openMainMenu();
            return;
          }
          if (selected.value === "__create") {
            promptCreateProfile();
            return;
          }
          const target = profiles.find((item) => item.id === selected.value);
          if (target) {
            openProfileActions(target);
          }
        }
      })
    );
  };

  const openProfileActions = (profile: ProfileView): void => {
    const options: TuiDialogSelectOption<string>[] = [
      { title: "Select as active", value: "select", description: "Set active metadata for next launch." },
      { title: "Rename", value: "rename", description: "Update profile display label." },
      { title: "Delete", value: "delete", description: "Soft-delete non-active profile." },
      { title: "Back", value: "back" }
    ];

    api.ui.dialog.replace(() =>
      api.ui.DialogSelect({
        title: `Profile: ${profile.label}`,
        options,
        onSelect: (selected) => {
          if (selected.value === "back") {
            void openProfileList();
            return;
          }
          if (selected.value === "select") {
            void (async () => {
              const result = await service.selectProfile(profile.id);
              api.ui.toast({ variant: result.ok ? "success" : "error", message: result.message });
              if (result.ok) {
                api.ui.dialog.replace(() =>
                  api.ui.DialogAlert({
                    title: "Profile selected",
                    message: "Restart OpenCode to apply provider auth isolation.",
                    onConfirm: () => void openProfileList()
                  })
                );
                return;
              }
              await openProfileList();
            })();
            return;
          }
          if (selected.value === "rename") {
            api.ui.dialog.replace(() =>
              api.ui.DialogPrompt({
                title: `Rename ${profile.id}`,
                value: profile.label,
                onConfirm: (nextLabel) => {
                  void (async () => {
                    const result = await service.renameProfile(profile.id, nextLabel);
                    api.ui.toast({ variant: result.ok ? "success" : "error", message: result.message });
                    await openProfileList();
                  })();
                },
                onCancel: () => openProfileActions(profile)
              })
            );
            return;
          }
          api.ui.dialog.replace(() =>
            api.ui.DialogConfirm({
              title: `Delete ${profile.id}?`,
              message: "This will soft-delete the profile metadata.",
              onCancel: () => openProfileActions(profile),
              onConfirm: () => {
                void (async () => {
                  const result = await service.softDeleteProfile(profile.id);
                  api.ui.toast({ variant: result.ok ? "success" : "error", message: result.message });
                  await openProfileList();
                })();
              }
            })
          );
        }
      })
    );
  };

  api.command.register(() => [
    {
      title: "Multi Profile Provider",
      value: "profile-ui",
      keybind: "alt+p,super+p",
      slash: { name: "profile-ui" },
      onSelect: () => void openMainMenu()
    }
  ]);
};

const plugin: TuiPluginModule & { id: string } = { id, tui };

export default plugin;
