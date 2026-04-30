export const ValidateOpenCodePluginApiProbe = async ({ client }) => {
  await client?.app?.log?.({
    body: {
      service: "validate-opencode-plugin-api-probe",
      level: "info",
      message: "Validation probe initialized"
    }
  });

  return {
    event: async ({ event }) => {
      await client?.app?.log?.({
        body: {
          service: "validate-opencode-plugin-api-probe",
          level: "debug",
          message: `Event received: ${event?.type ?? "unknown"}`
        }
      });
    },
    "shell.env": async (_input, output) => {
      output.env.VALIDATE_OPENCODE_PLUGIN_API = "true";
    },
    "tool.execute.before": async (input) => {
      await client?.app?.log?.({
        body: {
          service: "validate-opencode-plugin-api-probe",
          level: "debug",
          message: `Tool before: ${input?.tool ?? "unknown"}`
        }
      });
    },
    "tool.execute.after": async (input) => {
      await client?.app?.log?.({
        body: {
          service: "validate-opencode-plugin-api-probe",
          level: "debug",
          message: `Tool after: ${input?.tool ?? "unknown"}`
        }
      });
    },
    "tui.command.execute": async () => {
      await client?.app?.log?.({
        body: {
          service: "validate-opencode-plugin-api-probe",
          level: "info",
          message: "TUI command execute hook observed"
        }
      });
    },
    "tui.toast.show": async (input) => {
      await client?.app?.log?.({
        body: {
          service: "validate-opencode-plugin-api-probe",
          level: "info",
          message: `Toast hook observed: ${input?.message ?? "(no message)"}`
        }
      });
    },
    tool: {
      validate_plugin_probe: {
        description: "Validation probe custom tool",
        args: {},
        execute: async () => "Validation probe tool executed"
      }
    }
  };
};
