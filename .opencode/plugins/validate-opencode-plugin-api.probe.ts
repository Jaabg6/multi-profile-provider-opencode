export const probe = {
  id: "validate-opencode-plugin-api",
  purpose: "Record the OpenCode plugin API assumptions used by Multi Profile Provider tests.",
  checks: [
    "Profile operations are exposed through plugin tools.",
    "Slash commands use tool-first workflow prompts with CLI fallback.",
    "Runtime isolation is applied by launching OpenCode through mpp run or opencode-mpp."
  ]
};
