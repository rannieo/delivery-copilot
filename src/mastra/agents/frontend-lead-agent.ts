import { Agent } from "@mastra/core/agent";
import { frontendLeadPrompt } from "../shared/prompts/frontend-lead-prompt";
import { retrieveProjectContextTool } from "../tools/retrieve-project-context-tool";
import { saveAgentOutputTool } from "../tools/save-agent-output-tool";

export const frontendLeadAgent = new Agent({
  id: "frontend-lead-agent",
  name: "Frontend Lead Agent",
  description:
    "Designs web frontend pages, routes, components, state management, API integration, UX states, accessibility, responsive web behavior, and frontend implementation sequence.",
  instructions: `
${frontendLeadPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Solution Architect, Security Agent, and Backend Lead outputs.
- Use saveAgentOutputTool after producing the final Frontend Implementation Plan.
- Backend Lead output is mandatory context because frontend screens must align with API design.
- Security Agent output is mandatory context because frontend must reflect auth, permissions, masking, and safe error states.
- Do not create delivery tickets directly.
`,
    model: 'ollama-cloud/qwen3.5:397b',
    tools: {
        retrieveProjectContextTool,
        saveAgentOutputTool,
    },
});