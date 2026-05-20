import { Agent } from "@mastra/core/agent";
import { mobileLeadPrompt } from "../shared/prompts/mobile-lead-prompt.ts";
import { defaultAgentModelConfig } from "../config/index.ts";
import { retrieveProjectContextTool } from "../tools/retrieve-project-context-tool.ts";

export const mobileLeadAgent = new Agent({
  id: "mobile-lead-agent",
  name: "Mobile Lead Agent",
  description:
    "Determines mobile scope and creates a mobile implementation plan for responsive web, PWA, React Native, Flutter, or native mobile apps.",
  instructions: `
${mobileLeadPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Solution Architect, Security Agent, Backend Lead, and Frontend Lead outputs.
- Backend Lead output is mandatory context because mobile screens must align with API design.
- Security Agent output is mandatory context because mobile must reflect auth, token storage, permissions, masking, and safe error states.
- Frontend Lead output is mandatory context so mobile-specific scope does not duplicate responsive web scope.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  tools: {
    retrieveProjectContextTool,
  },
});
