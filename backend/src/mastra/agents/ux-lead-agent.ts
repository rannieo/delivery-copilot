import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { uxLeadPrompt } from "../shared/prompts/ux-lead-prompt.ts";
import { defaultAgentModelConfig } from "../config/index.ts";
import { retrieveProjectContextTool } from "../tools/retrieve-project-context-tool.ts";

export const uxLeadAgent = new Agent({
  id: "ux-lead-agent",
  name: "UX Lead Agent",
  description:
    "Translates product, architecture, and security constraints into a concrete UI/UX design plan: information architecture, primary flows, screen inventory with state triggers, component inventory, design tokens as roles, and per-screen WCAG criteria. Forbidden from producing generic design fluff — every decision cites a named principle or a user/context reason from prior agent outputs.",
  instructions: `
${uxLeadPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Solution Architect, and Security Agent outputs.
- Do not propose backend APIs or implementation. State data requirements per screen; the Backend Lead converts them to endpoints.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  },
});
